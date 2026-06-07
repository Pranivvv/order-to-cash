const cds = require('@sap/cds');

const today = () => new Date().toISOString().slice(0, 10);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const getId = (req) => req.params?.[0]?.ID;

module.exports = cds.service.impl(async function () {
  const {
    Customers,
    Products,
    SalesOrders,
    SalesOrderItems,
    Invoices,
    Payments,
    SalesOrderStatuses,
    SalesOrderDateRanges
  } = this.entities;

  this.on('READ', SalesOrderStatuses, () => salesOrderStatuses());
  this.on('READ', SalesOrderDateRanges, () => salesOrderDateRanges());

  this.before('READ', SalesOrders, (req) => {
    applySalesOrderDateRangeFilter(req);
  });

  this.before('CREATE', SalesOrders, async (req) => {
    if (!req.data.customer_ID) return req.error(400, 'Customer is required');

    const customer = await SELECT.one.from(Customers).where({ ID: req.data.customer_ID });
    if (!customer) return req.error(400, 'Customer not found');
    if (customer.blocked) return req.error(400, 'Cannot create sales order for blocked customer');

    if (!req.data.orderNumber) {
      const result = await SELECT.one`count(*) as cnt`.from(SalesOrders);
      req.data.orderNumber = `SO-${new Date().getFullYear()}-${String(Number(result.cnt) + 1).padStart(5, '0')}`;
    }

    req.data.orderDate ??= today();
    req.data.status ??= 'Draft';
    req.data.totalAmount ??= 0;
    req.data.currency ??= 'USD';
  });

  this.before('CREATE', SalesOrderItems, async (req) => {
    if (!req.data.order_ID) return req.error(400, 'Sales order is required');
    if (!req.data.product_ID) return;

    const order = await SELECT.one.from(SalesOrders).where({ ID: req.data.order_ID });
    if (!order) return req.error(400, 'Sales order not found');
    if (order.status !== 'Draft') return req.error(400, `Cannot change items for order in status ${order.status}`);

    const product = await SELECT.one.from(Products).where({ ID: req.data.product_ID });
    if (!product) return req.error(400, 'Product not found');

    const itemError = validateItemValues(req.data);
    if (itemError) return req.error(400, itemError);

    if (Number(product.stockQuantity || 0) < Number(req.data.quantity || 0)) {
      return req.error(400, 'Requested quantity exceeds available stock');
    }

    req.data.unitPrice ??= product.unitPrice;
    req.data.discount ??= 0;

    if (!req.data.lineNumber && req.data.order_ID) {
      const result = await SELECT.one`count(*) as cnt`.from(SalesOrderItems).where({ order_ID: req.data.order_ID });
      req.data.lineNumber = Number(result.cnt) + 1;
    }

    calculateLineTotal(req.data);
  });

  this.before('UPDATE', SalesOrderItems, async (req) => {
    const itemID = getId(req);
    const existing = itemID && await SELECT.one.from(SalesOrderItems).where({ ID: itemID });
    const orderID = req.data.order_ID || existing?.order_ID;

    if (orderID) {
      const order = await SELECT.one.from(SalesOrders).where({ ID: orderID });
      if (order && order.status !== 'Draft') return req.error(400, `Cannot change items for order in status ${order.status}`);
    }

    const data = { ...existing, ...req.data };
    const itemError = validateItemValues(data);
    if (itemError) return req.error(400, itemError);

    calculateLineTotal(data);
    if (data.lineTotal !== undefined) req.data.lineTotal = data.lineTotal;
  });

  this.after(['CREATE', 'UPDATE'], SalesOrderItems, async (item, req) => {
    const orderID = item?.order_ID || req.data?.order_ID;
    if (orderID) await updateOrderTotal(SalesOrderItems, SalesOrders, orderID);
  });

  this.after('READ', SalesOrders, (orders, req) => {
    const rows = Array.isArray(orders) ? orders : [orders];
    const permissions = userPermissions(req.user);

    for (const order of rows) {
      if (!order) continue;

      order.dateRange = '';
      order.canSubmitOrder = permissions.canSubmitOrder && order.status === 'Draft';
      order.canApproveOrder = permissions.canApproveOrder && ['Draft', 'Submitted'].includes(order.status);
      order.canRejectOrder = permissions.canRejectOrder && !['Invoiced', 'Paid', 'Rejected', 'Cancelled'].includes(order.status);
      order.canCancelOrder = permissions.canCancelOrder && !['Invoiced', 'Paid', 'Cancelled'].includes(order.status);
      order.canCreateInvoice = permissions.canCreateInvoice && order.status === 'Approved';
    }
  });

  this.on('blockCustomer', Customers, async (req) => {
    const ID = getId(req);
    const customer = await SELECT.one.from(Customers).where({ ID });
    if (!customer) return req.error(404, 'Customer not found');

    await UPDATE(Customers).set({
      blocked: true,
      blockReason: req.data.reason || 'Blocked from service action'
    }).where({ ID });

    return SELECT.one.from(Customers).where({ ID });
  });

  this.on('addStock', Products, async (req) => {
    const ID = getId(req);
    const product = await SELECT.one.from(Products).where({ ID });
    if (!product) return req.error(404, 'Product not found');

    const quantity = Number(req.data.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return req.error(400, 'Stock quantity must be a positive whole number');
    }

    await UPDATE(Products).set({
      stockQuantity: Number(product.stockQuantity || 0) + quantity
    }).where({ ID });

    return SELECT.one.from(Products).where({ ID });
  });

  this.on('submitOrder', SalesOrders, async (req) => {
    const ID = getId(req);
    const order = await SELECT.one.from(SalesOrders).where({ ID });
    if (!order) return req.error(404, 'Order not found');
    if (order.status !== 'Draft') return req.error(400, `Cannot submit order in status ${order.status}`);

    const readyError = await validateOrderReadyForProcessing(SalesOrderItems, SalesOrders, Products, order);
    if (readyError) return req.error(400, readyError);

    await adjustStockForOrder(SalesOrderItems, Products, ID, -1);

    await UPDATE(SalesOrders).set({ status: 'Submitted' }).where({ ID });
    return SELECT.one.from(SalesOrders).where({ ID });
  });

  this.on('approveOrder', SalesOrders, async (req) => {
    const ID = getId(req);
    const order = await SELECT.one.from(SalesOrders).where({ ID });
    if (!order) return req.error(404, 'Order not found');
    if (!['Submitted', 'Draft'].includes(order.status)) {
      return req.error(400, `Cannot approve order in status ${order.status}`);
    }

    if (order.status === 'Draft') {
      const readyError = await validateOrderReadyForProcessing(SalesOrderItems, SalesOrders, Products, order);
      if (readyError) return req.error(400, readyError);

      await adjustStockForOrder(SalesOrderItems, Products, ID, -1);
    }

    await UPDATE(SalesOrders).set({ status: 'Approved' }).where({ ID });
    return SELECT.one.from(SalesOrders).where({ ID });
  });

  this.on('rejectOrder', SalesOrders, async (req) => {
    const ID = getId(req);
    const order = await SELECT.one.from(SalesOrders).where({ ID });
    if (!order) return req.error(404, 'Order not found');
    if (['Invoiced', 'Paid'].includes(order.status)) {
      return req.error(400, `Cannot reject order in status ${order.status}`);
    }

    if (['Submitted', 'Approved'].includes(order.status)) {
      await adjustStockForOrder(SalesOrderItems, Products, ID, 1);
    }

    await UPDATE(SalesOrders).set({
      status: 'Rejected',
      notes: req.data.reason || order.notes
    }).where({ ID });

    return SELECT.one.from(SalesOrders).where({ ID });
  });

  this.on('cancelOrder', SalesOrders, async (req) => {
    const ID = getId(req);
    const order = await SELECT.one.from(SalesOrders).where({ ID });
    if (!order) return req.error(404, 'Order not found');
    if (['Invoiced', 'Paid'].includes(order.status)) {
      return req.error(400, `Cannot cancel order in status ${order.status}`);
    }

    if (['Submitted', 'Approved'].includes(order.status)) {
      await adjustStockForOrder(SalesOrderItems, Products, ID, 1);
    }

    await UPDATE(SalesOrders).set({ status: 'Cancelled' }).where({ ID });
    return SELECT.one.from(SalesOrders).where({ ID });
  });

  this.on('createInvoice', SalesOrders, async (req) => {
    const ID = getId(req);
    const order = await SELECT.one.from(SalesOrders).where({ ID });
    if (!order) return req.error(404, 'Order not found');
    if (order.status !== 'Approved') return req.error(400, 'Only approved orders can be invoiced');
    if (Number(order.totalAmount || 0) <= 0) return req.error(400, 'Only orders with a positive total can be invoiced');

    const existing = await SELECT.one.from(Invoices).where({ salesOrder_ID: ID });
    if (existing) return existing;

    const result = await SELECT.one`count(*) as cnt`.from(Invoices);
    const invoiceID = cds.utils.uuid();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Number(result.cnt) + 1).padStart(5, '0')}`;

    await INSERT.into(Invoices).entries({
      ID: invoiceID,
      invoiceNumber,
      salesOrder_ID: ID,
      invoiceDate: today(),
      dueDate: addDays(new Date(), 30),
      status: 'Open',
      totalAmount: order.totalAmount,
      currency: order.currency
    });

    await UPDATE(SalesOrders).set({
      status: 'Invoiced',
      invoice_ID: invoiceID
    }).where({ ID });

    return SELECT.one.from(Invoices).where({ ID: invoiceID });
  });

  this.on('recordPayment', Invoices, async (req) => {
    const ID = getId(req);
    const invoice = await SELECT.one.from(Invoices).where({ ID });
    if (!invoice) return req.error(404, 'Invoice not found');

    const amount = Number(req.data.amount);
    if (!amount || amount <= 0) return req.error(400, 'Payment amount must be greater than zero');
    if (['Paid', 'Cancelled'].includes(invoice.status)) return req.error(400, `Cannot record payment for invoice in status ${invoice.status}`);

    const existingPayments = await SELECT.from(Payments).where({ invoice_ID: ID });
    const alreadyPaid = existingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const openAmount = Number(invoice.totalAmount || 0) - alreadyPaid;
    if (amount > openAmount) return req.error(400, 'Payment amount exceeds open invoice amount');

    await INSERT.into(Payments).entries({
      ID: cds.utils.uuid(),
      invoice_ID: ID,
      paymentDate: today(),
      amount,
      method: req.data.method || 'Manual',
      reference: req.data.reference
    });

    const payments = await SELECT.from(Payments).where({ invoice_ID: ID });
    const paidTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const status = paidTotal >= Number(invoice.totalAmount || 0) ? 'Paid' : 'PartiallyPaid';

    await UPDATE(Invoices).set({ status }).where({ ID });

    if (status === 'Paid') {
      await UPDATE(SalesOrders).set({ status: 'Paid' }).where({ invoice_ID: ID });
    }

    return SELECT.one.from(Invoices).where({ ID });
  });

  this.on('topCustomers', async (req) => {
    const limit = Math.min(Number(req.data.limit || 10), 100);
    return SELECT.from(Customers).orderBy('creditLimit desc').limit(limit);
  });

  this.on('revenueByMonth', async (req) => {
    const year = Number(req.data.year || new Date().getFullYear());
    const orders = await SELECT.from(SalesOrders).where`orderDate between ${`${year}-01-01`} and ${`${year}-12-31`}`;
    const months = new Map();

    for (const order of orders) {
      if (['Cancelled', 'Rejected'].includes(order.status)) continue;
      const month = Number(String(order.orderDate).slice(5, 7));
      const current = months.get(month) || { month, revenue: 0, orderCount: 0 };
      current.revenue += Number(order.totalAmount || 0);
      current.orderCount += 1;
      months.set(month, current);
    }

    return [...months.values()].sort((left, right) => left.month - right.month);
  });

  this.on('currentUser', (req) => {
    return {
      id: req.user.id,
      ...userPermissions(req.user)
    };
  });
});

function salesOrderStatuses() {
  return [
    { code: 'Draft', name: 'Draft' },
    { code: 'Submitted', name: 'Submitted' },
    { code: 'Approved', name: 'Approved' },
    { code: 'Rejected', name: 'Rejected' },
    { code: 'InDelivery', name: 'In Delivery' },
    { code: 'Invoiced', name: 'Invoiced' },
    { code: 'Paid', name: 'Paid' },
    { code: 'Cancelled', name: 'Cancelled' }
  ];
}

function salesOrderDateRanges() {
  return [
    { code: 'today', name: 'Today' },
    { code: 'last7', name: 'Last 7 Days' },
    { code: 'last30', name: 'Last 30 Days' },
    { code: 'thisMonth', name: 'This Month' },
    { code: 'thisYear', name: 'This Year' }
  ];
}

function applySalesOrderDateRangeFilter(req) {
  const select = req.query?.SELECT;
  if (!select?.where) return;

  const extracted = extractDateRangeFilter(select.where);
  if (!extracted.dateRange) return;

  const range = dateRangeBounds(extracted.dateRange);
  select.where = extracted.where;

  if (!range) return;
  if (select.where.length) select.where.push('and');
  select.where.push(
    { ref: ['orderDate'] },
    '>=',
    { val: range.from },
    'and',
    { ref: ['orderDate'] },
    '<=',
    { val: range.to }
  );
}

function extractDateRangeFilter(where) {
  const result = [];
  let dateRange = '';

  for (let index = 0; index < where.length; index++) {
    const token = where[index];

    if (token?.xpr) {
      const nested = extractDateRangeFilter(token.xpr);
      dateRange ||= nested.dateRange;
      if (nested.where.length) result.push({ xpr: nested.where });
      continue;
    }

    if (isDateRangeRef(token) && isEqualsOperator(where[index + 1])) {
      dateRange = literalValue(where[index + 2]);
      index += 2;
      continue;
    }

    result.push(token);
  }

  return {
    dateRange,
    where: cleanupBooleanOperators(result)
  };
}

function cleanupBooleanOperators(where) {
  const cleaned = [];

  for (const token of where) {
    const isBoolean = token === 'and' || token === 'or';
    const previous = cleaned[cleaned.length - 1];

    if (isBoolean && (!cleaned.length || previous === 'and' || previous === 'or')) {
      continue;
    }

    cleaned.push(token);
  }

  while (cleaned[cleaned.length - 1] === 'and' || cleaned[cleaned.length - 1] === 'or') {
    cleaned.pop();
  }

  return cleaned;
}

function isDateRangeRef(token) {
  return token?.ref?.length === 1 && token.ref[0] === 'dateRange';
}

function isEqualsOperator(token) {
  return token === '=' || token === 'eq';
}

function literalValue(token) {
  return token?.val ?? token;
}

function dateRangeBounds(dateRange) {
  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayValue = formatDate(todayDate);

  switch (dateRange) {
    case 'today':
      return { from: todayValue, to: todayValue };
    case 'last7':
      return { from: formatDate(addLocalDays(todayDate, -6)), to: todayValue };
    case 'last30':
      return { from: formatDate(addLocalDays(todayDate, -29)), to: todayValue };
    case 'thisMonth':
      return { from: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: todayValue };
    case 'thisYear':
      return { from: formatDate(new Date(now.getFullYear(), 0, 1)), to: todayValue };
    default:
      return null;
  }
}

function addLocalDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function userPermissions(user) {
  const isAdmin = user.is('Admin');
  const has = (role) => isAdmin || user.is(role);

  return {
    canViewSalesOrders: has('SalesRep') || has('SalesManager') || has('FinanceUser'),
    canCreateOrder: has('SalesRep'),
    canSubmitOrder: has('SalesRep'),
    canApproveOrder: has('SalesManager'),
    canRejectOrder: has('SalesManager'),
    canCancelOrder: has('SalesRep') || has('SalesManager'),
    canCreateInvoice: has('FinanceUser'),
    canReadFinance: has('FinanceUser'),
    canRecordPayment: has('FinanceUser'),
    canAddStock: has('InventoryManager'),
    canViewAnalytics: has('SalesManager') || has('FinanceUser'),
    isAdmin
  };
}

function calculateLineTotal(data) {
  if (!data.quantity || !data.unitPrice) return;

  const quantity = Number(data.quantity);
  const unitPrice = Number(data.unitPrice);
  const discount = Number(data.discount || 0);
  data.lineTotal = Number((quantity * unitPrice * (1 - discount / 100)).toFixed(2));
}

function validateItemValues(data) {
  const quantity = Number(data.quantity);
  const discount = Number(data.discount || 0);
  const unitPrice = data.unitPrice === undefined ? undefined : Number(data.unitPrice);

  if (!quantity || quantity <= 0) return 'Sales order item quantity must be greater than zero';
  if (discount < 0 || discount > 100) return 'Sales order item discount must be between 0 and 100';
  if (unitPrice !== undefined && unitPrice < 0) return 'Sales order item unit price cannot be negative';

  return undefined;
}

async function updateOrderTotal(SalesOrderItems, SalesOrders, orderID) {
  const items = await SELECT.from(SalesOrderItems).where({ order_ID: orderID });
  const totalAmount = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  await UPDATE(SalesOrders).set({ totalAmount }).where({ ID: orderID });
}

async function validateOrderReadyForProcessing(SalesOrderItems, SalesOrders, Products, order) {
  const items = await SELECT.from(SalesOrderItems).where({ order_ID: order.ID });
  if (!items.length) return 'Sales order must have at least one item before submission';
  if (Number(order.totalAmount || 0) <= 0) return 'Sales order total must be greater than zero';

  for (const item of items) {
    const product = await SELECT.one.from(Products).where({ ID: item.product_ID });
    if (!product) return `Product ${item.product_ID} not found`;
    if (Number(product.stockQuantity || 0) < Number(item.quantity || 0)) {
      return `Requested quantity exceeds available stock for ${product.productCode}`;
    }
  }

  const persisted = await SELECT.one.from(SalesOrders).where({ ID: order.ID });
  if (!persisted) return 'Sales order not found';

  return undefined;
}

async function adjustStockForOrder(SalesOrderItems, Products, orderID, direction) {
  const items = await SELECT.from(SalesOrderItems).where({ order_ID: orderID });

  for (const item of items) {
    const product = await SELECT.one.from(Products).where({ ID: item.product_ID });
    const stockQuantity = Number(product.stockQuantity || 0) + direction * Number(item.quantity || 0);
    await UPDATE(Products).set({ stockQuantity }).where({ ID: item.product_ID });
  }
}

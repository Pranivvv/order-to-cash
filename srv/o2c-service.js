const cds = require('@sap/cds');

const today = () => new Date().toISOString().slice(0, 10);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const getId = (req) => req.params?.[0]?.ID;

module.exports = cds.service.impl(async function () {
  const { Customers, Products, SalesOrders, SalesOrderItems, Invoices, Payments } = this.entities;

  this.before('CREATE', SalesOrders, async (req) => {
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
    if (!req.data.product_ID) return;

    const product = await SELECT.one.from(Products).where({ ID: req.data.product_ID });
    if (!product) return req.error(400, 'Product not found');

    req.data.unitPrice ??= product.unitPrice;
    req.data.discount ??= 0;

    if (!req.data.lineNumber && req.data.order_ID) {
      const result = await SELECT.one`count(*) as cnt`.from(SalesOrderItems).where({ order_ID: req.data.order_ID });
      req.data.lineNumber = Number(result.cnt) + 1;
    }

    calculateLineTotal(req.data);
  });

  this.before('UPDATE', SalesOrderItems, (req) => {
    calculateLineTotal(req.data);
  });

  this.after(['CREATE', 'UPDATE'], SalesOrderItems, async (item, req) => {
    const orderID = item?.order_ID || req.data?.order_ID;
    if (orderID) await updateOrderTotal(SalesOrderItems, SalesOrders, orderID);
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

  this.on('submitOrder', SalesOrders, async (req) => {
    const ID = getId(req);
    const order = await SELECT.one.from(SalesOrders).where({ ID });
    if (!order) return req.error(404, 'Order not found');
    if (order.status !== 'Draft') return req.error(400, `Cannot submit order in status ${order.status}`);

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

    await UPDATE(SalesOrders).set({ status: 'Approved' }).where({ ID });
    return SELECT.one.from(SalesOrders).where({ ID });
  });

  this.on('rejectOrder', SalesOrders, async (req) => {
    const ID = getId(req);
    const order = await SELECT.one.from(SalesOrders).where({ ID });
    if (!order) return req.error(404, 'Order not found');

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

    await UPDATE(SalesOrders).set({ status: 'Cancelled' }).where({ ID });
    return SELECT.one.from(SalesOrders).where({ ID });
  });

  this.on('createInvoice', SalesOrders, async (req) => {
    const ID = getId(req);
    const order = await SELECT.one.from(SalesOrders).where({ ID });
    if (!order) return req.error(404, 'Order not found');
    if (order.status !== 'Approved') return req.error(400, 'Only approved orders can be invoiced');

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

    await INSERT.into(Payments).entries({
      ID: cds.utils.uuid(),
      invoice_ID: ID,
      paymentDate: today(),
      amount,
      method: req.data.method,
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
});

function calculateLineTotal(data) {
  if (!data.quantity || !data.unitPrice) return;

  const quantity = Number(data.quantity);
  const unitPrice = Number(data.unitPrice);
  const discount = Number(data.discount || 0);
  data.lineTotal = Number((quantity * unitPrice * (1 - discount / 100)).toFixed(2));
}

async function updateOrderTotal(SalesOrderItems, SalesOrders, orderID) {
  const items = await SELECT.from(SalesOrderItems).where({ order_ID: orderID });
  const totalAmount = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  await UPDATE(SalesOrders).set({ totalAmount }).where({ ID: orderID });
}

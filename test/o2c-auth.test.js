const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');

const base = 'http://localhost:4004/api/o2c';
const auth = {
  salesrep: basicAuth('salesrep'),
  manager: basicAuth('manager'),
  finance: basicAuth('finance'),
  inventory: basicAuth('inventory')
};

async function main() {
  const server = spawn(process.execPath, ['node_modules/@sap/cds-dk/bin/cds.js', 'serve', '--port', '4004'], {
    cwd: __dirname + '/..',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForService(server);

    await expectStatus('/Customers?$top=1', undefined, 401, 'GET');

    const customers = await get('/Customers?$top=1', auth.salesrep);
    const products = await get('/Products?$top=1', auth.salesrep);
    const salesUser = await get('/currentUser()', auth.salesrep);
    const managerUser = await get('/currentUser()', auth.manager);
    const financeUser = await get('/currentUser()', auth.finance);
    const inventoryUser = await get('/currentUser()', auth.inventory);
    const financeInvoices = await get('/Invoices?$top=1', auth.finance);
    const customer = customers.value[0];
    const product = products.value[0];

    assert.ok(customer, 'A seed customer is required');
    assert.ok(product, 'A seed product is required');
    assert.equal(salesUser.canViewSalesOrders, true, 'SalesRep should see Sales Orders app');
    assert.equal(salesUser.canCreateOrder, true, 'SalesRep should create orders');
    assert.equal(managerUser.canViewSalesOrders, true, 'SalesManager should see Sales Orders app');
    assert.equal(managerUser.canCreateOrder, false, 'SalesManager should not create orders');
    assert.equal(salesUser.canReadFinance, false, 'SalesRep should not read finance app data');
    assert.equal(salesUser.canRecordPayment, false, 'SalesRep should not record payments');
    assert.equal(financeUser.canReadFinance, true, 'FinanceUser should read finance app data');
    assert.equal(financeUser.canRecordPayment, true, 'FinanceUser should record payments');
    assert.equal(inventoryUser.canAddStock, true, 'InventoryManager should add stock');
    assert.ok(Array.isArray(financeInvoices.value), 'FinanceUser should read invoices');

    await expectStatus('/SalesOrders', {
      customer_ID: customer.ID,
      deliveryDate: '2026-11-15',
      currency: 'USD',
      salesRep: 'Blocked Manager Create'
    }, 403, 'POST', auth.manager);

    const order = await post('/SalesOrders', {
      customer_ID: customer.ID,
      deliveryDate: '2026-11-15',
      currency: 'USD',
      salesRep: 'Role Test'
    }, auth.salesrep);
    assert.equal(order.status, 'Draft');

    await post('/SalesOrderItems', {
      order_ID: order.ID,
      product_ID: product.ID,
      quantity: 1
    }, auth.salesrep);

    const submitted = await post(`/SalesOrders(${order.ID})/O2CService.submitOrder`, {}, auth.salesrep);
    assert.equal(submitted.status, 'Submitted');

    const salesRepSubmittedOrder = await get(`/SalesOrders(${order.ID})`, auth.salesrep);
    const managerSubmittedOrder = await get(`/SalesOrders(${order.ID})`, auth.manager);
    assert.equal(salesRepSubmittedOrder.canSubmitOrder, false, 'SalesRep should not see Submit after submission');
    assert.equal(salesRepSubmittedOrder.canApproveOrder, false, 'SalesRep should not see Approve');
    assert.equal(salesRepSubmittedOrder.canRejectOrder, false, 'SalesRep should not see Reject');
    assert.equal(salesRepSubmittedOrder.canCreateInvoice, false, 'SalesRep should not see Create Invoice');
    assert.equal(managerSubmittedOrder.canApproveOrder, true, 'SalesManager should see Approve for submitted orders');
    assert.equal(managerSubmittedOrder.canRejectOrder, true, 'SalesManager should see Reject for submitted orders');

    await expectStatus(`/SalesOrders(${order.ID})/O2CService.approveOrder`, {}, 403, 'POST', auth.salesrep);

    const approved = await post(`/SalesOrders(${order.ID})/O2CService.approveOrder`, {}, auth.manager);
    assert.equal(approved.status, 'Approved');

    await expectStatus(`/SalesOrders(${order.ID})/O2CService.createInvoice`, {}, 403, 'POST', auth.salesrep);

    const invoice = await post(`/SalesOrders(${order.ID})/O2CService.createInvoice`, {}, auth.finance);
    assert.equal(invoice.status, 'Open');

    await expectStatus(`/Invoices(${invoice.ID})/O2CService.recordPayment`, {
      amount: 1,
      method: 'Wire',
      reference: 'BLOCKED-SALESREP-PAYMENT'
    }, 403, 'POST', auth.salesrep);

    const paid = await post(`/Invoices(${invoice.ID})/O2CService.recordPayment`, {
      amount: Number(invoice.totalAmount),
      method: 'Wire',
      reference: 'ROLE-FINANCE-PAYMENT'
    }, auth.finance);
    assert.equal(paid.status, 'Paid');

    await expectStatus(`/Products(${product.ID})/O2CService.addStock`, {
      quantity: 1,
      reference: 'BLOCKED-SALESREP-STOCK'
    }, 403, 'POST', auth.salesrep);

    const stocked = await post(`/Products(${product.ID})/O2CService.addStock`, {
      quantity: 1,
      reference: 'ROLE-INVENTORY-STOCK'
    }, auth.inventory);
    assert.ok(Number(stocked.stockQuantity) >= 0, 'Inventory manager should add stock');

    console.log('Phase 12 role authorization test passed');
  } finally {
    stopServer(server);
  }
}

async function waitForService(server) {
  const started = Date.now();

  while (Date.now() - started < 30000) {
    if (server.exitCode !== null) {
      throw new Error(`CAP server exited early with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(base + '/');
      if ([200, 401, 403].includes(response.status)) return;
    } catch {
      // Keep polling until CAP is listening.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Timed out waiting for CAP server to start');
}

async function get(path, authorization) {
  const response = await fetch(base + path, {
    headers: authHeaders(authorization)
  });
  assert.equal(response.status, 200, `${path} should return HTTP 200`);
  return response.json();
}

async function post(path, body, authorization) {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: authHeaders(authorization),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function expectStatus(path, body, status, method = 'POST', authorization) {
  const response = await fetch(base + path, {
    method,
    headers: authHeaders(authorization),
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  assert.equal(response.status, status, `${method} ${path} should return HTTP ${status}`);
  return response.text();
}

function basicAuth(user, password = 'pass') {
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
}

function authHeaders(authorization) {
  const headers = {
    'accept': 'application/json',
    'content-type': 'application/json'
  };

  if (authorization) headers.authorization = authorization;
  return headers;
}

function stopServer(server) {
  if (!server.pid) return;

  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
    } catch {
      // The CAP process may already have stopped.
    }
  } else {
    server.kill('SIGTERM');
  }

  server.stdout.destroy();
  server.stderr.destroy();
}

main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});

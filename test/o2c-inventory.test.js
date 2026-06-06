const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');

const base = 'http://localhost:4004/api/o2c';

async function main() {
  const server = spawn(process.execPath, ['node_modules/@sap/cds-dk/bin/cds.js', 'serve', '--port', '4004'], {
    cwd: __dirname + '/..',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForService(server);

    const customers = await get('/Customers?$top=1');
    const products = await get("/Products?$filter=productCode eq 'PROD-001'");
    const customer = customers.value[0];
    const product = products.value[0];

    assert.ok(customer, 'A seed customer is required');
    assert.ok(product, 'Seed product PROD-001 is required');

    const startingStock = Number(product.stockQuantity);

    const cancellableOrder = await createOrder(customer.ID, 'Inventory Cancel Test');
    await addItem(cancellableOrder.ID, product.ID, 2);

    await post(`/SalesOrders(${cancellableOrder.ID})/O2CService.submitOrder`, {});
    assert.equal(await stockFor(product.ID), startingStock - 2, 'Submitting should reserve stock');

    await post(`/SalesOrders(${cancellableOrder.ID})/O2CService.cancelOrder`, {});
    assert.equal(await stockFor(product.ID), startingStock, 'Cancelling before invoice should release stock');

    const rejectedOrder = await createOrder(customer.ID, 'Inventory Reject Test');
    await addItem(rejectedOrder.ID, product.ID, 3);

    await post(`/SalesOrders(${rejectedOrder.ID})/O2CService.approveOrder`, {});
    assert.equal(await stockFor(product.ID), startingStock - 3, 'Direct approval should reserve stock');

    await post(`/SalesOrders(${rejectedOrder.ID})/O2CService.rejectOrder`, {
      reason: 'Inventory test rejection'
    });
    assert.equal(await stockFor(product.ID), startingStock, 'Rejecting before invoice should release stock');

    const invoicedOrder = await createOrder(customer.ID, 'Inventory Invoice Test');
    await addItem(invoicedOrder.ID, product.ID, 1);

    await post(`/SalesOrders(${invoicedOrder.ID})/O2CService.submitOrder`, {});
    await post(`/SalesOrders(${invoicedOrder.ID})/O2CService.approveOrder`, {});
    await post(`/SalesOrders(${invoicedOrder.ID})/O2CService.createInvoice`, {});
    assert.equal(await stockFor(product.ID), startingStock - 1, 'Invoiced orders should keep stock consumed');

    await expectStatus(`/SalesOrders(${invoicedOrder.ID})/O2CService.cancelOrder`, {}, 400);
    assert.equal(await stockFor(product.ID), startingStock - 1, 'Rejected cancel after invoice should not release stock');

    console.log('Phase 8 inventory reservation test passed');
  } finally {
    stopServer(server);
  }
}

async function createOrder(customerID, salesRep) {
  return post('/SalesOrders', {
    customer_ID: customerID,
    deliveryDate: '2026-10-15',
    currency: 'USD',
    salesRep
  });
}

async function addItem(orderID, productID, quantity) {
  return post('/SalesOrderItems', {
    order_ID: orderID,
    product_ID: productID,
    quantity
  });
}

async function stockFor(productID) {
  const product = await get(`/Products(${productID})`);
  return Number(product.stockQuantity);
}

async function waitForService(server) {
  const started = Date.now();

  while (Date.now() - started < 30000) {
    if (server.exitCode !== null) {
      throw new Error(`CAP server exited early with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(base + '/');
      if (response.ok) return;
    } catch {
      // Keep polling until CAP is listening.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Timed out waiting for CAP server to start');
}

async function get(path) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, `${path} should return HTTP 200`);
  return response.json();
}

async function post(path, body) {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function expectStatus(path, body, status) {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  assert.equal(response.status, status, `${path} should return HTTP ${status}`);
  return response.text();
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

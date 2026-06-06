const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');

const base = 'http://localhost:4004';
const service = `${base}/api/o2c`;

async function main() {
  const server = spawn(process.execPath, ['node_modules/@sap/cds-dk/bin/cds.js', 'serve', '--port', '4004'], {
    cwd: __dirname + '/..',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForService(server);

    await expectOk('/index.html');
    await expectOk('/salesorders/webapp/index.html');
    await expectOk('/analytics/webapp/index.html');
    await expectOk('/finance/webapp/index.html');
    await expectOk('/advanced/webapp/index.html');

    const customers = await get('/Customers?$top=1');
    const products = await get('/Products?$top=1');
    assert.ok(customers.value[0], 'At least one customer is required');
    assert.ok(products.value[0], 'At least one product is required');

    const created = await post('/SalesOrders', {
      customer_ID: customers.value[0].ID,
      deliveryDate: '2026-08-15',
      currency: 'USD',
      salesRep: 'Phase 5 Flow Test',
      notes: 'Created by automated end-to-end flow'
    });
    assert.equal(created.status, 'Draft');

    const item = await post('/SalesOrderItems', {
      order_ID: created.ID,
      product_ID: products.value[0].ID,
      quantity: 1
    });
    assert.ok(Number(item.lineTotal) > 0, 'Line total should be calculated');

    const submitted = await post(`/SalesOrders(${created.ID})/O2CService.submitOrder`, {});
    assert.equal(submitted.status, 'Submitted');

    const approved = await post(`/SalesOrders(${created.ID})/O2CService.approveOrder`, {});
    assert.equal(approved.status, 'Approved');

    const invoice = await post(`/SalesOrders(${created.ID})/O2CService.createInvoice`, {});
    assert.equal(invoice.status, 'Open');
    assert.ok(Number(invoice.totalAmount) > 0, 'Invoice should inherit the order total');

    const paid = await post(`/Invoices(${invoice.ID})/O2CService.recordPayment`, {
      amount: Number(invoice.totalAmount),
      method: 'Wire',
      reference: 'PHASE5-FLOW'
    });
    assert.equal(paid.status, 'Paid');

    const analytics = await get('/OrderAnalytics');
    assert.ok(Array.isArray(analytics.value), 'Order analytics should remain readable');

    console.log('Phase 5 O2C end-to-end flow test passed');
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
      const response = await fetch(`${service}/`);
      if (response.ok) return;
    } catch {
      // Wait until CAP is listening.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Timed out waiting for CAP server to start');
}

async function expectOk(path) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, `${path} should return HTTP 200`);
}

async function get(path) {
  const response = await fetch(service + path);
  assert.equal(response.status, 200, `${path} should return HTTP 200`);
  return response.json();
}

async function post(path, body) {
  const response = await fetch(service + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
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

const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');

const base = 'http://localhost:4004';
const service = `${base}/api/o2c`;
const auth = {
  salesrep: basicAuth('salesrep'),
  manager: basicAuth('manager'),
  finance: basicAuth('finance')
};

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
    await expectOk('/inventory/webapp/index.html');
    await expectOk('/advanced/webapp/index.html');

    const customers = await get('/Customers?$top=1', auth.salesrep);
    const products = await get('/Products?$top=1', auth.salesrep);
    assert.ok(customers.value[0], 'At least one customer is required');
    assert.ok(products.value[0], 'At least one product is required');

    const created = await post('/SalesOrders', {
      customer_ID: customers.value[0].ID,
      deliveryDate: '2026-08-15',
      currency: 'EUR',
      salesRep: 'Phase 5 Flow Test',
      notes: 'Created by automated end-to-end flow'
    }, auth.salesrep);
    assert.equal(created.status, 'Draft');

    const item = await post('/SalesOrderItems', {
      order_ID: created.ID,
      product_ID: products.value[0].ID,
      quantity: 1,
      unitPrice: 46000
    }, auth.salesrep);
    assert.equal(Number(item.lineTotal), 46000, 'Line total should use the selected currency unit price');

    const submitted = await post(`/SalesOrders(${created.ID})/O2CService.submitOrder`, {}, auth.salesrep);
    assert.equal(submitted.status, 'Submitted');

    const approved = await post(`/SalesOrders(${created.ID})/O2CService.approveOrder`, {}, auth.manager);
    assert.equal(approved.status, 'Approved');

    const invoice = await post(`/SalesOrders(${created.ID})/O2CService.createInvoice`, {}, auth.finance);
    assert.equal(invoice.status, 'Open');
    assert.equal(invoice.currency, 'EUR');
    assert.equal(Number(invoice.totalAmount), 46000, 'Invoice should inherit the converted order total');

    const paid = await post(`/Invoices(${invoice.ID})/O2CService.recordPayment`, {
      amount: Number(invoice.totalAmount),
      method: 'Wire',
      reference: 'PHASE5-FLOW'
    }, auth.finance);
    assert.equal(paid.status, 'Paid');

    const analytics = await get('/OrderAnalytics', auth.finance);
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
      const response = await fetch(`${service}/`, { headers: authHeaders(auth.salesrep) });
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

async function get(path, authorization) {
  const response = await fetch(service + path, { headers: authHeaders(authorization) });
  assert.equal(response.status, 200, `${path} should return HTTP 200`);
  return response.json();
}

async function post(path, body, authorization) {
  const response = await fetch(service + path, {
    method: 'POST',
    headers: authHeaders(authorization),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function basicAuth(user, password = 'pass') {
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
}

function authHeaders(authorization) {
  return {
    authorization,
    'accept': 'application/json',
    'content-type': 'application/json'
  };
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

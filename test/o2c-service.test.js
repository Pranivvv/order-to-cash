const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');

const base = 'http://localhost:4004/api/o2c';

async function main() {
  const server = spawn(process.execPath, ['node_modules/@sap/cds-dk/bin/cds.js', 'serve', '--port', '4004'], {
    cwd: __dirname + '/..',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  server.stdout.on('data', (chunk) => { output += chunk.toString(); });
  server.stderr.on('data', (chunk) => { output += chunk.toString(); });

  try {
    await waitForService(server);

    const customers = await get('/Customers');
    assert.ok(customers.value.length >= 3, 'Customers should be readable');

    const products = await get('/Products');
    assert.ok(products.value.length >= 3, 'Products should be readable');

    const created = await post('/SalesOrders', {
      customer_ID: customers.value[0].ID,
      deliveryDate: '2026-07-15',
      currency: 'USD',
      salesRep: 'Phase 1 Test'
    });
    assert.equal(created.status, 'Draft');
    assert.match(created.orderNumber, /^SO-2026-/);

    const item = await post('/SalesOrderItems', {
      order_ID: created.ID,
      product_ID: products.value[0].ID,
      quantity: 2,
      discount: 10
    });
    assert.equal(Number(item.lineTotal), 90000);

    const submitted = await post(`/SalesOrders(${created.ID})/O2CService.submitOrder`, {});
    assert.equal(submitted.status, 'Submitted');

    const approved = await post(`/SalesOrders(${created.ID})/O2CService.approveOrder`, {});
    assert.equal(approved.status, 'Approved');

    const invoice = await post(`/SalesOrders(${created.ID})/O2CService.createInvoice`, {});
    assert.equal(invoice.status, 'Open');
    assert.equal(Number(invoice.totalAmount), 90000);

    const paid = await post(`/Invoices(${invoice.ID})/O2CService.recordPayment`, {
      amount: 90000,
      method: 'Wire',
      reference: 'PHASE1-TEST'
    });
    assert.equal(paid.status, 'Paid');

    const analytics = await get('/OrderAnalytics');
    assert.ok(Array.isArray(analytics.value), 'Analytics view should be readable');

    console.log('Phase 1 OData service smoke test passed');
  } finally {
    if (server.pid) {
      if (process.platform === 'win32') {
        try {
          execFileSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
        } catch {
          // The process may already have exited after the final request.
        }
      } else {
        server.kill('SIGTERM');
      }
    }
    server.stdout.destroy();
    server.stderr.destroy();
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

main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
  process.exit(1);
});

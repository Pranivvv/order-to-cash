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
    const products = await get('/Products?$top=1');
    const customer = customers.value[0];
    const product = products.value[0];

    assert.ok(customer, 'A seed customer is required');
    assert.ok(product, 'A seed product is required');

    const emptyOrder = await createOrder(customer.ID, 'Validation Empty Order');
    await expectStatus(`/SalesOrders(${emptyOrder.ID})/O2CService.submitOrder`, {}, 400);

    const order = await createOrder(customer.ID, 'Validation Happy Path');

    await expectStatus('/SalesOrderItems', {
      order_ID: order.ID,
      product_ID: product.ID,
      quantity: 0
    }, 400);

    await expectStatus('/SalesOrderItems', {
      order_ID: order.ID,
      product_ID: product.ID,
      quantity: 1,
      discount: 150
    }, 400);

    const item = await post('/SalesOrderItems', {
      order_ID: order.ID,
      product_ID: product.ID,
      quantity: 1
    });
    assert.ok(Number(item.lineTotal) > 0, 'Valid item should calculate a line total');

    const submitted = await post(`/SalesOrders(${order.ID})/O2CService.submitOrder`, {});
    assert.equal(submitted.status, 'Submitted');

    await expectStatus('/SalesOrderItems', {
      order_ID: order.ID,
      product_ID: product.ID,
      quantity: 1
    }, 400);

    const approved = await post(`/SalesOrders(${order.ID})/O2CService.approveOrder`, {});
    assert.equal(approved.status, 'Approved');

    const invoice = await post(`/SalesOrders(${order.ID})/O2CService.createInvoice`, {});
    assert.equal(invoice.status, 'Open');

    await expectStatus(`/Invoices(${invoice.ID})/O2CService.recordPayment`, {
      amount: Number(invoice.totalAmount) + 1,
      method: 'Wire',
      reference: 'OVERPAY'
    }, 400);

    const halfAmount = Number((Number(invoice.totalAmount) / 2).toFixed(2));
    const partial = await post(`/Invoices(${invoice.ID})/O2CService.recordPayment`, {
      amount: halfAmount,
      method: 'Wire',
      reference: 'PARTIAL'
    });
    assert.equal(partial.status, 'PartiallyPaid');

    await expectStatus(`/Invoices(${invoice.ID})/O2CService.recordPayment`, {
      amount: Number(invoice.totalAmount),
      method: 'Wire',
      reference: 'OVER-REMAINING'
    }, 400);

    const paid = await post(`/Invoices(${invoice.ID})/O2CService.recordPayment`, {
      amount: Number(invoice.totalAmount) - halfAmount,
      method: 'Wire',
      reference: 'FINAL'
    });
    assert.equal(paid.status, 'Paid');

    await expectStatus(`/Invoices(${invoice.ID})/O2CService.recordPayment`, {
      amount: 1,
      method: 'Wire',
      reference: 'DUPLICATE'
    }, 400);

    console.log('Phase 7 validation test passed');
  } finally {
    stopServer(server);
  }
}

async function createOrder(customerID, salesRep) {
  return post('/SalesOrders', {
    customer_ID: customerID,
    deliveryDate: '2026-09-15',
    currency: 'USD',
    salesRep
  });
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

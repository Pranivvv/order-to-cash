# Order to Cash User Flow

Security and role checks are intentionally deferred. The current local flow uses open CAP endpoints to verify the business process.

## Flow

1. Create a draft sales order for a customer.
2. Add a sales order item and calculate line/order totals.
3. Submit the order.
4. Approve the order.
5. Create an invoice from the approved order.
6. Record a payment against the invoice.
7. Confirm the invoice and sales order are marked `Paid`.

## Local URLs

- Cockpit: `/index.html`
- Sales Orders: `/salesorders/webapp/index.html`
- Analytics: `/analytics/webapp/index.html`
- Finance: `/finance/webapp/index.html`
- Advanced UI: `/advanced/webapp/index.html`
- OData Service: `/api/o2c/`

## Finance UI Payment Step

1. Open `/finance/webapp/index.html`.
2. Select an open invoice.
3. Click `Record Payment`.
4. Enter the payment amount, method, and reference.
5. Click `Record`.
6. If total payments are greater than or equal to the invoice total, the invoice becomes `Paid` and the related sales order becomes `Paid`.

## Verification

Run:

```sh
npm run test:flow
```

The test starts CAP locally, executes the O2C lifecycle over HTTP, and shuts CAP down again.

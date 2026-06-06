# Order to Cash User Flow

Security and role checks are intentionally deferred. The current local flow uses open CAP endpoints to verify the business process.

## Flow

1. Create a draft sales order for a customer.
2. Select a product, quantity, and optional discount while creating the draft order.
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

## Advanced UI Draft Order And Stock Step

1. Open `/advanced/webapp/index.html?fresh=phase9`.
2. Review current product stock in the `Product Stock` table on the main page.
3. Click `Create Order`.
4. Select a customer.
5. Select a product.
6. Enter quantity and optional discount.
7. Confirm the `Available Stock`, `Unit Price`, and `Order Amount Preview`.
8. Click `Create`.
9. The app creates the draft sales order and one sales order item. CAP calculates the persisted line total and order total.
10. Submit or approve the order to reserve product stock. Cancel or reject before invoicing to release reserved stock.

## Verification

Run:

```sh
npm run test:flow
```

The test starts CAP locally, executes the O2C lifecycle over HTTP, and shuts CAP down again.

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
- Inventory: `/inventory/webapp/index.html`
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

1. Open `/advanced/webapp/index.html?fresh=phase11`.
2. Click `Create Order`.
3. Select a customer.
4. Select a product.
5. Select the order currency.
6. Enter quantity and optional discount.
7. Confirm the product-specific `Available Stock`, converted `Unit Price`, and `Order Amount Preview`.
8. Click `Create`.
9. The app creates the draft sales order and one sales order item. CAP calculates the persisted line total and order total from the converted unit price.
10. Submit or approve the order to reserve product stock. Cancel or reject before invoicing to release reserved stock.

Current demo exchange rates are maintained in the Advanced UI controller: USD `1`, EUR `0.92`, GBP `0.78`, INR `83`.

## Inventory UI Stock Step

1. Open `/inventory/webapp/index.html?fresh=phase11`.
2. Review product count, total stock, and low-stock KPI tiles.
3. Use the `Product Stock` table to check product code, description, category, unit price, stock, and availability status.
4. Use search to filter by product code, description, or category.
5. Click `Add Stock` on a product row.
6. Enter a positive whole-number quantity and optional reference.
7. Click `Add Stock`.
8. The product stock is increased through the bound Product action `addStock`.

## Verification

Run:

```sh
npm run test:flow
```

The test starts CAP locally, executes the O2C lifecycle over HTTP, and shuts CAP down again.

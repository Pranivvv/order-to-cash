# Order to Cash User Flow

Backend role checks are enabled with local mocked users. The freestyle UIs now also read `currentUser()` and hide or disable supported role-specific actions. The backend remains the source of truth.

## Local Mock Users

Use password `pass` for each local user:

- `salesrep`: `SalesRep`
- `manager`: `SalesManager`
- `finance`: `FinanceUser`
- `inventory`: `InventoryManager`
- `admin`: `Admin`

## Role-Aware UI Behavior

- Cockpit calls `currentUser()` on page load, so the browser asks for credentials before app selection.
- Cockpit shows only the app cards available to the logged-in role.
- Sales Orders cockpit card is visible to users who can view sales orders, including SalesRep, SalesManager, FinanceUser, and Admin.
- Advanced UI hides `Create Order` unless `currentUser().canCreateOrder` is true.
- Finance UI hides `Record Payment` unless `currentUser().canRecordPayment` is true.
- Finance UI disables `Record Payment` when no invoice is selected or the selected invoice is already `Paid`.
- Inventory UI hides row-level `Add Stock` unless `currentUser().canAddStock` is true.
- Fiori Elements Sales Orders action buttons use `Core.OperationAvailable` paths from the CAP service, so SalesRep does not receive manager/finance actions as available.

With local mocked Basic Auth, switching users requires a fresh incognito window, clearing site data for `localhost:4004`, or using a different browser.

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
npm run test:auth
```

The flow test starts CAP locally, executes the O2C lifecycle with role-specific users, and shuts CAP down again. The auth test verifies blocked actions return authorization errors.

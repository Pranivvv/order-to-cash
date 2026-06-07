# Order to Cash CAP Progress

## Scope Guard

- Backend role restrictions and local mock authentication are now enabled. UI role-aware visibility, app-router security, and full BTP XSUAA deployment wiring are deferred.
- Phase 1 focuses on the CAP data model, OData V4 service, service handlers, seed data, and local service tests.
- Phase 2 focuses on the Fiori Elements Sales Orders app without user-api role checks.

## Phase 1 - OData Services

Status: Complete

Completed:
- Created CAP project metadata in `package.json`.
- Created O2C CDS data model in `db/schema.cds`.
- Added seed data under `db/data/`.
- Created OData V4 service `O2CService` at `/api/o2c`.
- Exposed Customers, Products, SalesOrders, SalesOrderItems, Invoices, Payments, and OrderAnalytics.
- Added bound actions for order lifecycle, invoicing, payments, and customer blocking.
- Added unbound functions for top customers and revenue by month.
- Added Fiori-ready service annotations without security annotations.
- Installed CAP dependencies.
- Compiled the service model successfully.
- Deployed the model and seed data to local SQLite.
- Passed HTTP smoke tests for entity reads, order creation, item total calculation, submit, approve, create invoice, record payment, and analytics read.

Remaining after Phase 1:
- Add broader negative-path tests for all action status transitions.
- Add analytical UI and chart refinements.
- Add security configuration and role restrictions in a later phase.

## Phase 2 - Fiori Elements Sales Orders App

Status: Complete

Completed:
- Created `app/salesorders` Fiori Elements application shell.
- Added manifest-driven OData V4 connection to `/api/o2c/`.
- Added List Report route for `SalesOrders` with ResponsiveTable, multi-select, export, and full screen enabled.
- Added Object Page route for `SalesOrders`.
- Added Object Page route for `SalesOrderItems`.
- Added i18n labels for the app and common O2C objects/actions.
- Added Fiori annotations for Sales Order status display and lifecycle action buttons.
- Validated the app manifest JSON.
- Compiled service metadata with annotations.
- Confirmed the CAP service endpoint returns HTTP 200.
- Confirmed the Sales Orders app HTML returns HTTP 200 at `/salesorders/webapp/index.html`.
- Re-ran the Phase 1 OData smoke test successfully after annotation changes.
- Fixed blank-page startup issues by adding full-height app hosting, disabling flex/lrep lookup for now, adding preload/i18n fallback files, and validating previously missing UI resources return HTTP 200.

Deferred:
- Role-based button visibility.
- user-api integration.
- XSUAA and app-router security.

## Phase 3 - Analytics And Visualization App

Status: Complete

Completed:
- Added chart annotations for `OrderAnalytics` in `srv/analytics-annotations.cds`.
- Created freestyle SAPUI5 analytics app in `app/analytics`.
- Added overview page with KPI tiles for total revenue, open orders, invoiced orders, and paid orders.
- Added recent orders and top customers panels.
- Added analytics page with VizFrame monthly revenue bar chart.
- Added analytics page with VizFrame status distribution donut chart.
- Added shared analytics data loader that reads from `/api/o2c/SalesOrders`, `/api/o2c/Customers`, and `/api/o2c/revenueByMonth(year=2026)`.
- Added i18n fallback files, full-height bootstrap, and preload placeholder to avoid the startup issues seen in Phase 2.

Verified:
- Analytics manifest JSON is valid.
- Service metadata compiles with `srv/analytics-annotations.cds`.
- `npm run test:service` passes.
- CAP returns HTTP 200 for `/analytics/webapp/index.html`.
- CAP returns HTTP 200 for the analytics views, controller, preload, and i18n resources.
- CAP returns HTTP 200 for the runtime analytics JSON endpoints.

Deferred:
- OVP/Fiori launchpad card packaging.
- MockServer mode.
- Security-aware analytics filtering.

## Phase 4 - Advanced UI5 Patterns

Status: Complete

Completed:
- Created freestyle SAPUI5 app in `app/advanced`.
- Added main sales orders page using a custom `ExtendedTable`.
- Added detail page using `OrderSummaryCard` XML composite control.
- Added lazy-loaded create order fragment with customer selection, delivery date, notes, and currency.
- Added status filter fragment with status filters and sort options.
- Added confirmation dialog fragment for reusable dialog patterns.
- Added custom `StatusBadge` control with renderer API v2 and status-specific styling.
- Added `ExtendedTable` control extending `sap.m.Table` with export and refresh toolbar actions.
- Added small reusable `o2c.lib` library with an `OrderStatus` enum and `OrderCard` control.
- Added controller logic for loading orders/customers, creating sales orders, filtering, sorting, navigation, status click handling, and CSV export.

Verified:
- Advanced app manifest JSON is valid.
- Service metadata still compiles with service, UI, and analytics annotations.
- `npm run test:service` passes.
- CAP returns HTTP 200 for `/advanced/webapp/index.html`.
- CAP returns HTTP 200 for advanced views, fragments, controls, CSS, preload, and CAP data endpoints.
- New advanced app JavaScript files pass `node --check`.

Deferred:
- Deep browser interaction testing with Playwright.
- Excel export via `sap.ui.export.Spreadsheet`; current export is lightweight CSV.
- Reusing these controls inside the Fiori Elements app.

## Phase 5 - End-to-End User Flow Verification

Status: Complete

Completed:
- Added local cockpit page at `app/index.html`.
- Added links to Sales Orders, Analytics, Advanced UI, and the OData service.
- Added `docs/user-flow.md` documenting the current non-security O2C lifecycle.
- Added `test/o2c-flow.test.js` to execute the full local flow over HTTP.
- Added `npm run test:flow` script.

Verified:
- `package.json` is valid JSON.
- `test/o2c-flow.test.js` passes `node --check`.
- `npm run test:flow` passes.
- `npm run test:service` still passes.

Covered flow:
- Create draft sales order.
- Add sales order item.
- Submit order.
- Approve order.
- Create invoice.
- Record full payment.
- Confirm analytics remains readable.

Deferred:
- Role-specific flow branches for SalesRep, SalesManager, FinanceUser, and Admin.
- Security-protected user journey after XSUAA is introduced.
- Browser automation with screenshots.

## Phase 6 - Finance Invoice Payment UI

Status: Complete

Completed:
- Created freestyle SAPUI5 finance app in `app/finance`.
- Added invoice list with invoice number, sales order number, due date, total, currency, and status.
- Added selected invoice summary panel.
- Added payments table for the selected invoice.
- Added lazy-loaded Record Payment dialog with amount, method, and reference.
- Wired Record Payment to the existing bound action `Invoices(...)/O2CService.recordPayment`.
- Added Finance link to the local cockpit page.
- Updated `docs/user-flow.md` with the UI payment step.
- Updated `test/o2c-flow.test.js` to verify the Finance app is served.

Verified:
- Finance manifest JSON is valid.
- Finance Component and controller pass `node --check`.
- `npm run test:flow` passes.
- `npm run test:service` passes.
- CAP returns HTTP 200 for Finance app HTML, view, fragment, controller, i18n, Invoices, and Payments resources.

Covered UI flow:
- Open Finance app.
- Select invoice.
- Open Record Payment dialog.
- Submit payment to `recordPayment`.
- Backend updates invoice to `Paid` or `PartiallyPaid`; if fully paid, related sales order becomes `Paid`.

Deferred:
- Finance-specific role checks.
- Partial-payment balance calculation in the UI.
- Browser automation for clicking through the payment dialog.

## Phase 7 - Business Validation And Negative-Path Tests

Status: Complete

Completed:
- Added customer validation when creating sales orders.
- Prevented creating sales orders for blocked customers.
- Prevented submitting empty or zero-total sales orders.
- Added sales order item validation for missing order, missing product, invalid quantity, invalid discount, negative unit price, and insufficient stock.
- Prevented item changes after the sales order leaves Draft status.
- Prevented invoicing approved orders with a zero total.
- Prevented payments against Paid or Cancelled invoices.
- Prevented overpayments beyond the remaining open invoice amount.
- Added default payment method fallback for manual payments.
- Added `test/o2c-validation.test.js` for negative-path validation coverage.
- Added `npm run test:validation` script.

Verified:
- `node --check srv/o2c-service.js` passes.
- `node --check test/o2c-validation.test.js` passes.
- `npm run test:validation` passes.
- `npm run test:flow` passes.
- `npm run test:service` passes.

Deferred:
- Browser automation for validating UI error messages.
- Stock deduction/reservation during order approval or invoicing.
- Security and role restrictions.

## Phase 8 - Inventory Reservation

Status: Complete

Completed:
- Added stock reservation when a Draft order is submitted.
- Added stock reservation when a Draft order is approved directly.
- Kept reserved stock consumed once an order is invoiced.
- Released reserved stock when Submitted or Approved orders are rejected.
- Released reserved stock when Submitted or Approved orders are cancelled.
- Prevented reject after Invoiced or Paid status to avoid releasing consumed stock incorrectly.
- Added `test/o2c-inventory.test.js` for stock reservation, release, and post-invoice protection.
- Added `npm run test:inventory` script.

Verified:
- `node --check srv/o2c-service.js` passes.
- `node --check test/o2c-inventory.test.js` passes.
- `npm run test:inventory` passes.
- `npm run test:validation` passes.
- `npm run test:service` passes.
- `npm run test:flow` passes.

Deferred:
- Dedicated inventory movement ledger.
- Product-level stock adjustment UI.
- Concurrent stock locking for high-volume production scenarios.
- Security and role restrictions.

## Phase 9 - Stock-Aware Draft Order UI

Status: Complete

Completed:
- Added Products loading to the Advanced UI shared view model.
- Added `Product Stock` table to the Advanced UI main screen.
- Extended the Create Order dialog with product selection, quantity, discount, available stock, unit price, and order amount preview.
- Updated Create Order logic to create the draft sales order and its first sales order item in one UI flow.
- Added client-side validation for missing product, invalid quantity, quantity above stock, and invalid discount.
- Updated the local cockpit Advanced UI link to use the Phase 9 cache key.
- Updated `docs/user-flow.md` with stock-aware draft creation steps.

Verified:
- `node --check app/advanced/webapp/controller/Main.controller.js` passes.
- `node --check app/advanced/webapp/controller/BaseController.js` passes.
- Advanced manifest and project `package.json` parse as valid JSON.
- `npm run test:inventory` passes.
- `npm run test:flow` passes.
- CAP returns HTTP 200 for Advanced UI HTML, main view, create-order fragment, main controller, and Products stock endpoint.

Deferred:
- Multi-line item entry in the create dialog.
- Add-item action from the order detail page for existing Draft orders.
- Product-level stock adjustment UI.
- Security and role restrictions.

## Phase 10 - Dedicated Inventory App

Status: Complete

Completed:
- Created dedicated freestyle SAPUI5 inventory app in `app/inventory`.
- Added product stock overview with KPI tiles for product count, total stock, and low-stock count.
- Added searchable product stock table with product code, description, category, unit price, stock, and availability status.
- Removed the full product stock table from the Advanced UI main screen.
- Kept product, quantity, discount, available stock, unit price, and amount preview inside the Advanced UI Create Order dialog.
- Added Inventory link to the local cockpit page.
- Updated `docs/user-flow.md` with separate Inventory and Draft Order steps.
- Updated `test/o2c-flow.test.js` to verify the Inventory app is served.

Verified:
- `node --check app/inventory/webapp/Component.js` passes.
- `node --check app/inventory/webapp/controller/Products.controller.js` passes.
- `node --check test/o2c-flow.test.js` passes.
- Inventory manifest parses as valid JSON.
- Inventory and Advanced XML views parse successfully.
- `npm run test:flow` passes.
- CAP returns HTTP 200 for Inventory app HTML, Component, Products view, Products controller, locale i18n, and Products stock endpoint.

Deferred:
- Product-level stock adjustment UI.
- Inventory movement ledger.
- Low-stock threshold configuration.
- Security and role restrictions.

## Phase 11 - Currency-Aware Draft Pricing And Stock Add

Status: Complete

Completed:
- Added bound Product action `addStock(quantity, reference)` to the OData service.
- Implemented `addStock` validation and stock increase handling in the CAP service.
- Added `Add Stock` row action to the Inventory app.
- Added Inventory `Add Stock` dialog with product, current stock, quantity, and reference fields.
- Updated Inventory controller to call `Products(...)/O2CService.addStock` and refresh stock after success.
- Added local demo currency conversion in the Advanced UI Create Order flow.
- Updated Advanced UI unit price and order amount preview when product or currency changes.
- Sent the converted unit price when creating the initial sales order item so CAP persists the selected-currency total.
- Updated cockpit cache keys and user-flow documentation.
- Extended tests to cover Product `addStock` and converted EUR order totals.

Verified:
- `node --check app/advanced/webapp/controller/Main.controller.js` passes.
- `node --check app/inventory/webapp/controller/Products.controller.js` passes.
- `node --check test/o2c-inventory.test.js` passes.
- `node --check test/o2c-flow.test.js` passes.
- Inventory and Advanced XML files parse successfully.
- `npx cds compile srv --to csn` passes and includes the Product `addStock` action.
- `npm run test:inventory` passes.
- `npm run test:flow` passes.
- `npm run test:validation` passes.
- `npm run test:service` passes.
- CAP returns HTTP 200 for updated Advanced fragment/controller, Inventory view/fragment/controller, and service metadata.

Deferred:
- Real exchange-rate service or maintained currency-rate table.
- Inventory movement ledger for stock additions.
- Product creation/editing UI.
- Security and role restrictions.

## Phase 12 - Backend Roles And Local Mock Auth

Status: Complete

Completed:
- Enabled CAP service-level authentication with `@(requires: 'authenticated-user')`.
- Added role restrictions for Customers, Products, SalesOrders, SalesOrderItems, Invoices, Payments, and OrderAnalytics.
- Added mock development users in `package.json`:
  - `salesrep` / `pass` with `SalesRep`
  - `manager` / `pass` with `SalesManager`
  - `finance` / `pass` with `FinanceUser`
  - `inventory` / `pass` with `InventoryManager`
  - `admin` / `pass` with `Admin`
- Added `xs-security.json` with O2C scopes, role templates, and role collections.
- Updated existing service, flow, validation, and inventory tests to authenticate.
- Added `test/o2c-auth.test.js` for role-specific allowed and blocked action coverage.
- Added `npm run test:auth` script.

Role model:
- `SalesRep`: read master/order data, create draft orders, create/edit order items, submit orders.
- `SalesManager`: read orders/invoices/analytics, approve or reject orders, cancel eligible orders.
- `FinanceUser`: read order/invoice/payment data, create invoices, record payments, read analytics.
- `InventoryManager`: read products/customers, add product stock.
- `Admin`: allowed across protected O2C actions.

Verified:
- All updated test files pass `node --check`.
- `package.json` and `xs-security.json` parse as valid JSON.
- `npx cds compile srv --to csn` passes and includes auth annotations.
- `npm run test:auth` passes.
- `npm run test:service` passes.
- `npm run test:validation` passes.
- `npm run test:inventory` passes.
- `npm run test:flow` passes.

Deferred:
- UI role detection and role-based button/menu visibility.
- App-router and real XSUAA deployment wiring.
- Role-based browser automation.

## Phase 13 - Role-Aware Freestyle UI

Status: Complete

Completed:
- Added `currentUser()` function to `O2CService` for UI role capability checks.
- Implemented `currentUser()` handler with capability booleans for create order, submit, approve, reject, cancel, invoice, payment, stock add, analytics, and admin.
- Updated Advanced UI model loading to read `currentUser()`.
- Hid Advanced UI `Create Order` unless the user can create orders.
- Updated Finance UI model loading to read `currentUser()`.
- Added `canReadFinance` capability to make Finance app access checks explicit.
- Added Finance UI logged-in user indicator.
- Added Finance UI pre-check that shows a clear role message before loading invoices when the logged-in user is not FinanceUser/Admin.
- Hid Finance UI `Record Payment` unless the user can record payments.
- Disabled Finance UI `Record Payment` when no invoice is selected or the selected invoice is already paid.
- Updated Inventory UI model loading to read `currentUser()`.
- Hid Inventory row-level `Add Stock` unless the user can add stock.
- Extended `test/o2c-auth.test.js` to verify `currentUser()` capability flags.
- Updated `docs/user-flow.md` with role-aware UI behavior.

Verified:
- `node --check srv/o2c-service.js` passes.
- `node --check app/advanced/webapp/controller/BaseController.js` passes.
- `node --check app/finance/webapp/controller/Invoices.controller.js` passes.
- `node --check app/inventory/webapp/controller/Products.controller.js` passes.
- `node --check test/o2c-auth.test.js` passes.
- Advanced, Finance, and Inventory XML views parse successfully.
- `npx cds compile srv --to csn` passes.
- `npm run test:auth` passes.
- `npm run test:service` passes.
- `npm run test:flow` passes.
- `npm run test:validation` passes.
- `npm run test:inventory` passes.
- CAP returns HTTP 200 for `currentUser()` and updated freestyle UI resources.

Deferred:
- Fiori Elements Sales Orders role-aware action visibility.
- App-router and real XSUAA deployment wiring.
- Browser automation proving buttons are hidden for each mock user.

## Phase 14 - Role-Aware Cockpit Login

Status: Complete

Completed:
- Updated local cockpit `app/index.html` to call `/api/o2c/currentUser()` on page load.
- Moved Basic Auth prompt to cockpit startup instead of first app API request.
- Added logged-in user display to the cockpit header.
- Added local mock user guidance to the cockpit page.
- Hid cockpit app cards based on `currentUser()` capability flags.
- Updated cockpit app links with fresh cache keys for role-aware app versions.
- Documented the Basic Auth user-switching caveat in `docs/user-flow.md`.

Verified:
- Cockpit HTML contains the `currentUser()` startup check.
- `npm run test:auth` passes.
- CAP returns HTTP 200 for `/index.html`.
- CAP returns HTTP 200 for `/api/o2c/currentUser()` with `finance:pass`.

Deferred:
- Real logout button, which needs app-router/XSUAA logout support.

## Phase 15 - Sales Orders Fiori Elements Action Availability

Status: Complete

Completed:
- Added virtual SalesOrder action-availability fields:
  - `canSubmitOrder`
  - `canApproveOrder`
  - `canRejectOrder`
  - `canCancelOrder`
  - `canCreateInvoice`
- Populated the availability fields per user role and order status in the CAP service `after READ` handler.
- Added `@Core.OperationAvailable` annotations to SalesOrder bound actions.
- Kept backend `@restrict` checks as the final authorization enforcement.
- Extended `test/o2c-auth.test.js` to verify SalesRep does not get manager/finance action availability while SalesManager does get approve/reject availability.

Verified:
- `node --check srv/o2c-service.js` passes.
- `node --check test/o2c-auth.test.js` passes.
- `npx cds compile srv --to edmx` includes `Core.OperationAvailable` paths for SalesOrder actions.
- `npm run test:auth` passes.
- `npm run test:service` passes.
- `npm run test:flow` passes.
- `npm run test:validation` passes.
- `npm run test:inventory` passes.

Deferred:
- Browser automation proving the Fiori Elements buttons are hidden/disabled visually for each role.
- Real logout button, which needs app-router/XSUAA logout support.

## Phase 16 - Cockpit Sales Orders Visibility Fix

Status: Complete

Completed:
- Added `canViewSalesOrders` to `currentUser()`.
- Updated cockpit Sales Orders card to use `canViewSalesOrders` instead of `canCreateOrder`.
- Kept Advanced UI tied to `canCreateOrder` because it is a draft creation app.
- Updated Sales Orders cockpit link cache key to `phase16`.
- Extended auth test to verify SalesManager can see Sales Orders but cannot create orders.

Verified:
- `node --check srv/o2c-service.js` passes.
- `node --check test/o2c-auth.test.js` passes.
- `npx cds compile srv --to csn` passes.
- `npm run test:auth` passes.

Deferred:
- Real logout button, which needs app-router/XSUAA logout support.

## Phase 17 - UI Search and Filter Fixes

Status: Complete

Completed:
- Added a Sales Orders search field to the Advanced UI.
- Reworked Advanced UI search, status filtering, and sorting to derive visible rows from `/allOrders`.
- Reworked Inventory search to derive visible rows from `/allProducts`.
- Bound search fields to model state so refresh keeps the current search text.
- Kept service authorization unchanged.

Verified:
- `node --check app/advanced/webapp/controller/Main.controller.js` passes.
- `node --check app/advanced/webapp/controller/BaseController.js` passes.
- `node --check app/advanced/webapp/Component.js` passes.
- `node --check app/inventory/webapp/controller/Products.controller.js` passes.
- `node --check app/inventory/webapp/Component.js` passes.
- Advanced and Inventory XML views/fragments parse successfully.
- `npm run test:auth` passes.
- `npm run test:inventory` passes.

Browser checks needed:
- Advanced UI: search by order number/customer/status, then combine with the Status filter.
- Inventory UI: search by product code, description, category, or currency.

## Phase 18 - Advanced UI Status And Date Filter Options

Status: Complete

Completed:
- Added explicit Order Date filter options to the Advanced UI filter dialog:
  - Today
  - Last 7 Days
  - Last 30 Days
  - This Month
  - This Year
- Kept the existing status options as a separate multi-select filter group.
- Updated filter handling so status selections and date selections are processed separately.
- Added client-side date range matching for `orderDate`.

Verified:
- `node --check app/advanced/webapp/controller/Main.controller.js` passes.
- `node --check app/advanced/webapp/Component.js` passes.
- Advanced status/date filter XML parses successfully.
- `npm run test:auth` passes.

Browser checks needed:
- Advanced UI: open Filter, select one or more Status values, and confirm.
- Advanced UI: open Filter, select one Order Date option, and confirm.
- Advanced UI: combine Status plus Order Date and verify the order table narrows correctly.

## Phase 19 - Sales Orders Filter Value Lists

Status: Complete

Completed:
- Added fixed value-list options for Sales Orders `status`.
- Added a Sales Orders `Date Range` filter field with preset values:
  - Today
  - Last 7 Days
  - Last 30 Days
  - This Month
  - This Year
- Added `SalesOrderStatuses` and `SalesOrderDateRanges` value-list entities to the OData service.
- Added CAP filtering logic that converts selected Date Range presets into `orderDate` conditions.
- Updated the cockpit Sales Orders link cache key to `phase19`.

Verified:
- `node --check srv/o2c-service.js` passes.
- `npx cds compile srv --to csn` passes.
- `npx cds compile srv --to edmx` exposes the new value-list entity sets.
- `npm run test:auth` passes.
- `npm run test:service` passes.
- Local OData check returns 8 status options and 5 date options.
- Local OData check for `SalesOrders?$filter=dateRange eq 'thisYear'` returns data.

Browser checks needed:
- Sales Orders app: open Adapt Filters or the filter value help for Status and confirm the status options appear.
- Sales Orders app: add/select Date Range and confirm the five preset date options appear.
- Sales Orders app: combine Status plus Date Range and verify the list report narrows correctly.

## Phase 20 - Inventory Low Stock Threshold Fix

Status: Complete

Completed:
- Centralized the Inventory low-stock threshold in the inventory model.
- Raised the threshold from `10` to `100` so stock that is low but not zero still shows warning.
- Updated the Low Stock KPI to use the shared threshold.
- Updated table stock/status styling to use the shared threshold.
- Updated the cockpit Inventory link cache key to `phase20`.

Verified:
- `node --check app/inventory/webapp/controller/Products.controller.js` passes.
- `node --check app/inventory/webapp/Component.js` passes.
- Inventory Products XML parses successfully.
- `npm run test:inventory` passes.

Browser checks needed:
- Inventory UI: Product stock `50` and `100` should show `Low Stock`.
- Inventory UI: Low Stock KPI should count products at or below `100`.

## Phase 21 - Production Security And Approuter Wiring

Status: Complete

Completed:
- Added production CAP JWT authentication configuration.
- Added `@sap/xssec` dependency for production token validation.
- Added SAP Application Router module under `app/router`.
- Added `app/router/xs-app.json` with XSUAA-protected UI and API routes.
- Added approuter logout endpoint `/logout` and logout page `/logout.html`.
- Added cockpit Logout button that uses approuter logout outside local CAP direct mode.
- Added `mta.yaml` with CAP service, approuter, XSUAA resource, and auth-token forwarding destination.
- Added OAuth login redirect URI configuration to `xs-security.json`.
- Added Node 22 engine metadata for CAP and approuter modules.
- Added `docs/security.md` with local users, role collections, logout behavior, and deployment steps.

Verified:
- Root and router npm dependency lockfiles were generated.
- JSON files parse successfully:
  - `package.json`
  - `package-lock.json`
  - `xs-security.json`
  - `app/router/package.json`
  - `app/router/package-lock.json`
  - `app/router/xs-app.json`
- CAP production auth resolves to JWT/XSUAA binding lookup.
- CAP development auth remains mocked for local users.
- `npx cds compile srv --to csn` passes.
- `npm run test:auth` passes.
- `npm run test:service` passes.
- `npm run test:flow` passes.
- `npm run test:validation` passes.
- `npm run test:inventory` passes.

Deployment checks needed:
- Build an MTAR with `mbt build`.
- Deploy to Cloud Foundry with `cf deploy`.
- Assign BTP users to the generated `O2C_*` role collections.
- Open the approuter URL and verify login, role-specific app visibility, API access, and `/logout`.

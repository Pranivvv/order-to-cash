# Order to Cash CAP Progress

## Scope Guard

- Security configuration, XSUAA, roles, role collections, app-router security, and authorization checks are intentionally deferred.
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

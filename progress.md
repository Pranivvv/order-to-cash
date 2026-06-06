# Order to Cash CAP Progress

## Scope Guard

- Security configuration, XSUAA, roles, role collections, app-router security, and authorization checks are intentionally deferred.
- Phase 1 focuses on the CAP data model, OData V4 service, service handlers, seed data, and local service tests.

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
- Add Fiori Elements UI in `app/salesorders`.
- Add analytical UI and chart refinements.
- Add security configuration and role restrictions in a later phase.

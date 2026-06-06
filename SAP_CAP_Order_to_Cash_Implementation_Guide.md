# SAP CAP Full Stack — Order to Cash (O2C) Implementation Guide
### Complete Codex Prompt Reference | XSUAA · CDS · SAPUI5 · Fiori Elements

---

## TABLE OF CONTENTS

1. [Project Overview & Architecture](#1-project-overview--architecture)
2. [Project Structure](#2-project-structure)
3. [Part A — Login & Role-Based Authentication (XSUAA)](#3-part-a--login--role-based-authentication-xsuaa)
4. [Part B — CAP CRUD App (OData V4 + Annotations)](#4-part-b--cap-crud-app-odata-v4--annotations)
5. [Part C — Charts, Visualization & Analytical App](#5-part-c--charts-visualization--analytical-app)
6. [Part D — Advanced UI5 Patterns](#6-part-d--advanced-ui5-patterns)
7. [Full User Flow Walkthrough](#7-full-user-flow-walkthrough)
8. [Deployment & MTA Configuration](#8-deployment--mta-configuration)
9. [End-to-End Codex Prompt Checklist](#9-end-to-end-codex-prompt-checklist)

---

## 1. Project Overview & Architecture

### Business Process: Order to Cash (O2C)

```
[Lead/Quote] → [Sales Order] → [Delivery] → [Invoice] → [Payment] → [Reconciliation]
```

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BTP (Cloud Foundry)                           │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────────┐ │
│  │  SAPUI5 App  │    │  CAP (Node)  │    │  SAP HANA Cloud / SQLite│ │
│  │  (Fiori El.) │◄──►│  OData V4    │◄──►│  Persistence Layer     │ │
│  │  freestyle   │    │  CDS Service │    │  (dev: SQLite)         │ │
│  └──────┬───────┘    └──────┬───────┘    └────────────────────────┘ │
│         │                   │                                         │
│  ┌──────▼───────────────────▼──────────────────────────────────────┐ │
│  │                    XSUAA (Authorization)                         │ │
│  │   Roles: SalesRep | SalesManager | FinanceUser | Admin           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────────┐ │
│  │ App Router   │    │ Destination  │    │  SAP Analytics Cloud   │ │
│  │ (@sap/approuter)│  │ Service      │    │  (optional embed)      │ │
│  └──────────────┘    └──────────────┘    └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend | SAPUI5 (Fiori Elements + Freestyle) |
| Backend | SAP CAP (Node.js) |
| API Protocol | OData V4 |
| Auth | XSUAA (OAuth 2.0 / JWT) |
| Database (dev) | SQLite |
| Database (prod) | SAP HANA Cloud |
| Deployment | SAP BTP Cloud Foundry, MTA |
| Build Tool | @ui5/cli, cds CLI |
| Mock | CAP built-in mock, UI5 MockServer |

---

## 2. Project Structure

```
o2c-cap-project/
│
├── app/                              # UI5 Frontends
│   ├── salesorders/                  # Part B — Fiori Elements List+Object Page
│   │   ├── webapp/
│   │   │   ├── manifest.json
│   │   │   ├── Component.js
│   │   │   └── i18n/
│   │   └── ui5.yaml
│   │
│   ├── analytics/                    # Part C — Overview & Analytical App
│   │   ├── webapp/
│   │   │   ├── manifest.json
│   │   │   ├── Component.js
│   │   │   ├── view/
│   │   │   │   ├── Overview.view.xml
│   │   │   │   └── Analytics.view.xml
│   │   │   ├── controller/
│   │   │   │   ├── Overview.controller.js
│   │   │   │   └── Analytics.controller.js
│   │   │   └── localService/        # Mock Server
│   │   │       ├── mockserver.js
│   │   │       └── metadata.xml
│   │   └── ui5.yaml
│   │
│   └── advanced/                     # Part D — Fragments, Controls, Libraries
│       ├── webapp/
│       │   ├── manifest.json
│       │   ├── view/
│       │   │   ├── Main.view.xml
│       │   │   └── Detail.view.xml
│       │   ├── fragment/
│       │   │   ├── CreateOrder.fragment.xml
│       │   │   ├── StatusFilter.fragment.xml
│       │   │   └── ConfirmDialog.fragment.xml
│       │   ├── control/
│       │   │   ├── StatusBadge.js         # Custom Control
│       │   │   └── ExtendedTable.js       # Extending sap.m.Table
│       │   ├── library/
│       │   │   ├── library.js
│       │   │   └── control/
│       │   │       └── OrderCard.js       # Library Control
│       │   └── controller/
│       └── ui5.yaml
│
├── db/                               # CDS Data Model
│   ├── schema.cds
│   ├── data/                         # CSV seed data
│   │   ├── o2c-Customers.csv
│   │   ├── o2c-Products.csv
│   │   ├── o2c-SalesOrders.csv
│   │   └── o2c-SalesOrderItems.csv
│   └── src/                          # HANA specific (optional)
│
├── srv/                              # CAP Services
│   ├── o2c-service.cds               # OData V4 Service definition
│   ├── o2c-service.js                # Custom handlers
│   ├── auth/
│   │   └── roles.cds                 # Role restrictions
│   └── analytics/
│       └── analytics-service.cds     # Analytical service
│
├── xs-security.json                  # XSUAA security descriptor
├── xs-app.json                       # App Router config
├── package.json
├── .cdsrc.json
└── mta.yaml                          # MTA deployment descriptor
```

---

## 3. Part A — Login & Role-Based Authentication (XSUAA)

### 3.1 Roles & Scopes Design

| Role | Scope | Access |
|---|---|---|
| `SalesRep` | `SalesOrder.Read`, `SalesOrder.Create` | Create & view own orders |
| `SalesManager` | `SalesOrder.Read`, `SalesOrder.Approve`, `SalesOrder.Delete` | Approve/reject, full order view |
| `FinanceUser` | `Invoice.Read`, `Invoice.Create`, `Payment.Read` | Invoicing & payment management |
| `Admin` | All scopes | Full access |

### 3.2 xs-security.json

```json
{
  "xsappname": "o2c-cap-app",
  "tenant-mode": "dedicated",
  "description": "Order to Cash Security Descriptor",
  "scopes": [
    { "name": "$XSAPPNAME.SalesOrder.Read",    "description": "Read Sales Orders" },
    { "name": "$XSAPPNAME.SalesOrder.Create",  "description": "Create Sales Orders" },
    { "name": "$XSAPPNAME.SalesOrder.Approve", "description": "Approve Sales Orders" },
    { "name": "$XSAPPNAME.SalesOrder.Delete",  "description": "Delete Sales Orders" },
    { "name": "$XSAPPNAME.Invoice.Read",       "description": "Read Invoices" },
    { "name": "$XSAPPNAME.Invoice.Create",     "description": "Create Invoices" },
    { "name": "$XSAPPNAME.Payment.Read",       "description": "Read Payments" },
    { "name": "$XSAPPNAME.Admin",              "description": "Admin Access" }
  ],
  "role-templates": [
    {
      "name": "SalesRep",
      "description": "Sales Representative",
      "scope-references": [
        "$XSAPPNAME.SalesOrder.Read",
        "$XSAPPNAME.SalesOrder.Create"
      ]
    },
    {
      "name": "SalesManager",
      "description": "Sales Manager",
      "scope-references": [
        "$XSAPPNAME.SalesOrder.Read",
        "$XSAPPNAME.SalesOrder.Approve",
        "$XSAPPNAME.SalesOrder.Delete"
      ]
    },
    {
      "name": "FinanceUser",
      "description": "Finance User",
      "scope-references": [
        "$XSAPPNAME.Invoice.Read",
        "$XSAPPNAME.Invoice.Create",
        "$XSAPPNAME.Payment.Read"
      ]
    },
    {
      "name": "Admin",
      "description": "Administrator",
      "scope-references": [
        "$XSAPPNAME.SalesOrder.Read",
        "$XSAPPNAME.SalesOrder.Create",
        "$XSAPPNAME.SalesOrder.Approve",
        "$XSAPPNAME.SalesOrder.Delete",
        "$XSAPPNAME.Invoice.Read",
        "$XSAPPNAME.Invoice.Create",
        "$XSAPPNAME.Payment.Read",
        "$XSAPPNAME.Admin"
      ]
    }
  ],
  "role-collections": [
    {
      "name": "O2C_SalesRep",
      "role-template-references": [ "$XSAPPNAME.SalesRep" ]
    },
    {
      "name": "O2C_SalesManager",
      "role-template-references": [ "$XSAPPNAME.SalesManager" ]
    },
    {
      "name": "O2C_FinanceUser",
      "role-template-references": [ "$XSAPPNAME.FinanceUser" ]
    },
    {
      "name": "O2C_Admin",
      "role-template-references": [ "$XSAPPNAME.Admin" ]
    }
  ]
}
```

### 3.3 xs-app.json (App Router)

```json
{
  "welcomeFile": "/salesorders/",
  "authenticationMethod": "route",
  "sessionTimeout": 30,
  "logout": {
    "logoutEndpoint": "/do/logout",
    "logoutPage": "/logout-page.html"
  },
  "routes": [
    {
      "source": "^/salesorders/(.*)$",
      "target": "$1",
      "localDir": "app/salesorders/webapp",
      "authenticationType": "xsuaa"
    },
    {
      "source": "^/analytics/(.*)$",
      "target": "$1",
      "localDir": "app/analytics/webapp",
      "authenticationType": "xsuaa"
    },
    {
      "source": "^/advanced/(.*)$",
      "target": "$1",
      "localDir": "app/advanced/webapp",
      "authenticationType": "xsuaa"
    },
    {
      "source": "^/api/(.*)$",
      "target": "/$1",
      "destination": "o2c-srv-api",
      "authenticationType": "xsuaa",
      "csrfProtection": true
    },
    {
      "source": "^/user-api/currentUser$",
      "target": "/currentUser",
      "service": "sap-approuter-userapi",
      "authenticationType": "xsuaa"
    }
  ]
}
```

### 3.4 CDS — Role Restrictions in Service

```cds
// srv/auth/roles.cds
using { O2CService } from '../o2c-service';

// Annotate entities with role-based access
annotate O2CService.SalesOrders with @(requires: 'authenticated-user');

annotate O2CService.SalesOrders with @(
  restrict: [
    { grant: 'READ',   to: ['SalesRep','SalesManager','FinanceUser','Admin'] },
    { grant: 'CREATE', to: ['SalesRep','Admin'] },
    { grant: ['UPDATE','DELETE'], to: ['SalesManager','Admin'] }
  ]
);

annotate O2CService.Invoices with @(
  restrict: [
    { grant: 'READ',   to: ['FinanceUser','Admin'] },
    { grant: 'CREATE', to: ['FinanceUser','Admin'] }
  ]
);
```

### 3.5 CAP Auth Configuration (.cdsrc.json)

```json
{
  "requires": {
    "auth": {
      "kind": "xsuaa"
    },
    "db": {
      "kind": "hana",
      "[development]": {
        "kind": "sqlite",
        "credentials": { "url": "db/o2c.db" }
      }
    }
  },
  "features": {
    "fetch_csrf": true
  },
  "[development]": {
    "auth": "mocked",
    "mocked": {
      "users": {
        "alice": {
          "roles": ["SalesRep"]
        },
        "bob": {
          "roles": ["SalesManager"]
        },
        "carol": {
          "roles": ["FinanceUser"]
        },
        "admin": {
          "roles": ["Admin","SalesRep","SalesManager","FinanceUser"]
        }
      }
    }
  }
}
```

### 3.6 UI5 — Reading User Info & Conditional Rendering

```javascript
// webapp/Component.js
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("o2c.salesorders.Component", {
    metadata: { manifest: "json" },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      // Fetch current user info from App Router user-api
      fetch("/user-api/currentUser")
        .then(res => res.json())
        .then(user => {
          const oUserModel = new JSONModel({
            name: user.name,
            email: user.email,
            roles: user.roles || [],
            isSalesRep:    (user.roles || []).includes("O2C_SalesRep"),
            isSalesManager:(user.roles || []).includes("O2C_SalesManager"),
            isFinanceUser: (user.roles || []).includes("O2C_FinanceUser"),
            isAdmin:       (user.roles || []).includes("O2C_Admin"),
            canApprove:    (user.roles || []).some(r =>
                             ["O2C_SalesManager","O2C_Admin"].includes(r)),
            canDelete:     (user.roles || []).some(r =>
                             ["O2C_SalesManager","O2C_Admin"].includes(r))
          });
          this.setModel(oUserModel, "user");
        });

      this.getRouter().initialize();
    }
  });
});
```

```xml
<!-- Conditional button visibility in view based on user model -->
<Button
  text="Approve"
  type="Accept"
  press="onApprove"
  visible="{= ${user>/canApprove} === true }" />

<Button
  text="Delete"
  type="Reject"
  press="onDelete"
  visible="{= ${user>/canDelete} === true }" />
```

---

## 4. Part B — CAP CRUD App (OData V4 + Annotations)

### 4.1 CDS Data Model (db/schema.cds)

```cds
namespace o2c;

using { cuid, managed, sap.common.CodeList } from '@sap/cds/common';

// ─── Customers ───────────────────────────────────────────────
entity Customers : cuid, managed {
  customerNumber : String(20)  @mandatory;
  name           : String(100) @mandatory;
  email          : String(100);
  phone          : String(30);
  creditLimit    : Decimal(15,2);
  country        : String(3);
  orders         : Association to many SalesOrders on orders.customer = $self;
}

// ─── Products ────────────────────────────────────────────────
entity Products : cuid, managed {
  productCode    : String(20)  @mandatory;
  description    : String(200) @mandatory;
  unitPrice      : Decimal(15,2) @mandatory;
  stockQuantity  : Integer;
  category       : String(50);
  currency       : String(3) default 'USD';
}

// ─── Sales Orders ────────────────────────────────────────────
entity SalesOrders : cuid, managed {
  orderNumber    : String(20)  @mandatory;
  customer       : Association to Customers @mandatory;
  orderDate      : Date        default $now;
  deliveryDate   : Date;
  status         : String(20)  default 'Draft'
                   @assert.range enum {
                     Draft; Submitted; Approved; Rejected;
                     InDelivery; Invoiced; Paid; Cancelled;
                   };
  totalAmount    : Decimal(15,2);
  currency       : String(3)   default 'USD';
  salesRep       : String(100);
  notes          : String(500);
  items          : Composition of many SalesOrderItems on items.order = $self;
  invoice        : Association to Invoices;
}

// ─── Sales Order Items ───────────────────────────────────────
entity SalesOrderItems : cuid {
  order          : Association to SalesOrders;
  lineNumber     : Integer;
  product        : Association to Products @mandatory;
  quantity       : Integer @mandatory @assert.range: [1,9999];
  unitPrice      : Decimal(15,2);
  discount       : Decimal(5,2) default 0;
  lineTotal      : Decimal(15,2);
}

// ─── Invoices ────────────────────────────────────────────────
entity Invoices : cuid, managed {
  invoiceNumber  : String(20)  @mandatory;
  salesOrder     : Association to SalesOrders @mandatory;
  invoiceDate    : Date        default $now;
  dueDate        : Date;
  status         : String(20)  default 'Open'
                   @assert.range enum {
                     Open; PartiallyPaid; Paid; Overdue; Cancelled;
                   };
  totalAmount    : Decimal(15,2);
  currency       : String(3)   default 'USD';
  payments       : Composition of many Payments on payments.invoice = $self;
}

// ─── Payments ────────────────────────────────────────────────
entity Payments : cuid, managed {
  invoice        : Association to Invoices;
  paymentDate    : Date;
  amount         : Decimal(15,2);
  method         : String(30);
  reference      : String(50);
}
```

### 4.2 OData V4 Service Definition (srv/o2c-service.cds)

```cds
using { o2c } from '../db/schema';

service O2CService @(path: '/api/o2c') {

  // ── Customers ──────────────────────────────────────────────
  entity Customers     as projection on o2c.Customers
    actions {
      action blockCustomer(reason: String) returns Customers;
    };

  // ── Products ───────────────────────────────────────────────
  @readonly
  entity Products      as projection on o2c.Products;

  // ── Sales Orders ───────────────────────────────────────────
  entity SalesOrders   as projection on o2c.SalesOrders {
    *,
    customer.name       as customerName,
    customer.country    as customerCountry,
    items
  } actions {
    action submitOrder()  returns SalesOrders;
    action approveOrder() returns SalesOrders;
    action rejectOrder(reason: String) returns SalesOrders;
    action cancelOrder()  returns SalesOrders;
    action createInvoice() returns Invoices;
  };

  // ── Sales Order Items ──────────────────────────────────────
  entity SalesOrderItems as projection on o2c.SalesOrderItems {
    *,
    product.description as productName,
    product.unitPrice   as catalogPrice
  };

  // ── Invoices ───────────────────────────────────────────────
  entity Invoices      as projection on o2c.Invoices {
    *,
    salesOrder.orderNumber as orderNumber
  } actions {
    action recordPayment(amount: Decimal, method: String, reference: String)
      returns Invoices;
  };

  // ── Payments ───────────────────────────────────────────────
  entity Payments      as projection on o2c.Payments;

  // ── Analytics (flat view for charts) ──────────────────────
  @readonly
  view OrderAnalytics as SELECT from o2c.SalesOrders {
    status,
    count(*)            as orderCount  : Integer,
    sum(totalAmount)    as totalRevenue : Decimal(15,2),
    orderDate,
    salesRep
  } group by status, orderDate, salesRep;

  // ── Functions ─────────────────────────────────────────────
  function topCustomers(limit: Integer) returns array of Customers;
  function revenueByMonth(year: Integer) returns array of {
    month: Integer;
    revenue: Decimal(15,2);
    orderCount: Integer;
  };
}
```

### 4.3 Custom CAP Service Handlers (srv/o2c-service.js)

```javascript
const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const { SalesOrders, Invoices, Payments, Customers } = this.entities;

  // ── Before CREATE: auto-generate order number ────────────────
  this.before('CREATE', SalesOrders, async (req) => {
    if (!req.data.orderNumber) {
      const count = await SELECT.one`count(*) as cnt`.from(SalesOrders);
      req.data.orderNumber = `SO-${new Date().getFullYear()}-${String(count.cnt + 1).padStart(5,'0')}`;
    }
    req.data.salesRep = req.user.id;
  });

  // ── Before CREATE SalesOrderItems: calculate line total ──────
  this.before('CREATE', 'SalesOrderItems', async (req) => {
    const { quantity, unitPrice, discount } = req.data;
    if (quantity && unitPrice) {
      const disc = discount || 0;
      req.data.lineTotal = parseFloat((quantity * unitPrice * (1 - disc / 100)).toFixed(2));
    }
  });

  // ── After CREATE/UPDATE Items: recalculate order total ───────
  this.after(['CREATE','UPDATE','DELETE'], 'SalesOrderItems', async (_, req) => {
    const orderID = req.data?.order_ID || req.query?.where?.order_ID;
    if (!orderID) return;
    const items = await SELECT.from('SalesOrderItems').where({ order_ID: orderID });
    const total = items.reduce((sum, i) => sum + (i.lineTotal || 0), 0);
    await UPDATE(SalesOrders, orderID).with({ totalAmount: total });
  });

  // ── Action: submitOrder ──────────────────────────────────────
  this.on('submitOrder', SalesOrders, async (req) => {
    const { ID } = req.params[0];
    const order = await SELECT.one.from(SalesOrders, ID);
    if (!order) return req.error(404, 'Order not found');
    if (order.status !== 'Draft') return req.error(400, `Cannot submit order in status: ${order.status}`);
    await UPDATE(SalesOrders, ID).with({ status: 'Submitted' });
    return SELECT.one.from(SalesOrders, ID);
  });

  // ── Action: approveOrder ─────────────────────────────────────
  this.on('approveOrder', SalesOrders, async (req) => {
    if (!req.user.is('SalesManager') && !req.user.is('Admin')) {
      return req.error(403, 'Only SalesManager or Admin can approve orders');
    }
    const { ID } = req.params[0];
    await UPDATE(SalesOrders, ID).with({ status: 'Approved' });
    return SELECT.one.from(SalesOrders, ID);
  });

  // ── Action: rejectOrder ──────────────────────────────────────
  this.on('rejectOrder', SalesOrders, async (req) => {
    if (!req.user.is('SalesManager') && !req.user.is('Admin')) {
      return req.error(403, 'Only SalesManager or Admin can reject orders');
    }
    const { ID } = req.params[0];
    const { reason } = req.data;
    await UPDATE(SalesOrders, ID).with({
      status: 'Rejected',
      notes: reason
    });
    return SELECT.one.from(SalesOrders, ID);
  });

  // ── Action: createInvoice ────────────────────────────────────
  this.on('createInvoice', SalesOrders, async (req) => {
    const { ID } = req.params[0];
    const order = await SELECT.one.from(SalesOrders, ID);
    if (order.status !== 'Approved') {
      return req.error(400, 'Can only invoice Approved orders');
    }
    const invoiceCount = await SELECT.one`count(*) as cnt`.from(Invoices);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount.cnt + 1).padStart(5,'0')}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await INSERT.into(Invoices).entries({
      invoiceNumber,
      salesOrder_ID: ID,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      totalAmount: order.totalAmount,
      currency: order.currency,
      status: 'Open'
    });

    await UPDATE(SalesOrders, ID).with({
      status: 'Invoiced',
      invoice_ID: invoice.ID
    });

    return SELECT.one.from(Invoices).where({ invoiceNumber });
  });

  // ── Action: recordPayment ────────────────────────────────────
  this.on('recordPayment', Invoices, async (req) => {
    const { ID } = req.params[0];
    const { amount, method, reference } = req.data;
    const invoice = await SELECT.one.from(Invoices, ID);

    await INSERT.into(Payments).entries({
      invoice_ID: ID,
      paymentDate: new Date().toISOString().split('T')[0],
      amount, method, reference
    });

    const payments = await SELECT.from(Payments).where({ invoice_ID: ID });
    const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
    const newStatus = paidTotal >= invoice.totalAmount ? 'Paid' : 'PartiallyPaid';
    await UPDATE(Invoices, ID).with({ status: newStatus });

    // Update parent Sales Order
    if (newStatus === 'Paid') {
      await UPDATE(SalesOrders).where({ invoice_ID: ID }).with({ status: 'Paid' });
    }
    return SELECT.one.from(Invoices, ID);
  });

  // ── Function: topCustomers ───────────────────────────────────
  this.on('topCustomers', async (req) => {
    const { limit = 10 } = req.data;
    return SELECT.from(Customers)
      .limit(limit)
      .orderBy('creditLimit desc');
  });

  // ── Function: revenueByMonth ─────────────────────────────────
  this.on('revenueByMonth', async (req) => {
    const { year = new Date().getFullYear() } = req.data;
    return cds.run(
      `SELECT MONTH(orderDate) as month,
              SUM(totalAmount) as revenue,
              COUNT(*) as orderCount
       FROM o2c_SalesOrders
       WHERE YEAR(orderDate) = ?
         AND status NOT IN ('Cancelled','Rejected')
       GROUP BY MONTH(orderDate)
       ORDER BY month`, [year]
    );
  });

  // ── Error Handling ───────────────────────────────────────────
  this.on('error', (err, req) => {
    if (err.code === 'SQLITE_CONSTRAINT') {
      err.message = 'Duplicate entry or constraint violation';
    }
  });
});
```

### 4.4 Fiori Elements Annotations (OData V4)

```cds
// srv/annotations.cds
using O2CService from './o2c-service';

// ════════════════════════════════════════════
// SALES ORDERS — List Report + Object Page
// ════════════════════════════════════════════

annotate O2CService.SalesOrders with @(

  // ── UI Line Item (List columns) ──────────────────────────────
  UI.LineItem: [
    { $Type: 'UI.DataField',        Value: orderNumber,    Label: 'Order #'    },
    { $Type: 'UI.DataField',        Value: customerName,   Label: 'Customer'   },
    { $Type: 'UI.DataField',        Value: orderDate,      Label: 'Order Date' },
    { $Type: 'UI.DataField',        Value: totalAmount,    Label: 'Total'      },
    { $Type: 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#status', Label: 'Status'                          },
    { $Type: 'UI.DataField',        Value: salesRep,       Label: 'Sales Rep'  },
    { $Type: 'UI.DataFieldForAction',
      Action: 'O2CService.submitOrder', Label: 'Submit'                        },
    { $Type: 'UI.DataFieldForAction',
      Action: 'O2CService.approveOrder', Label: 'Approve'                      }
  ],

  // ── Selection Fields (filter bar) ──────────────────────────
  UI.SelectionFields: [ status, orderDate, customer_ID, salesRep ],

  // ── Data Point — Status with criticality ───────────────────
  UI.DataPoint #status: {
    Value: status,
    Criticality: {
      $edmJson: {
        $If: [
          { $Eq: [{ $Path: 'status' }, 'Approved']  }, 3,  // Positive (green)
          { $If: [
            { $Eq: [{ $Path: 'status' }, 'Rejected'] }, 1, // Negative (red)
            { $If: [
              { $Eq: [{ $Path: 'status' }, 'Submitted'] }, 2, // Critical (orange)
              0  // Neutral
            ]}
          ]}
        ]
      }
    }
  },

  // ── Header Info (Object Page title area) ───────────────────
  UI.HeaderInfo: {
    TypeName:       'Sales Order',
    TypeNamePlural: 'Sales Orders',
    Title:          { Value: orderNumber },
    Description:    { Value: customerName }
  },

  // ── Facets (Object Page sections) ──────────────────────────
  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'General Information',
      Target: '@UI.FieldGroup#General'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Order Items',
      Target: 'items/@UI.LineItem'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Invoice',
      Target: 'invoice/@UI.FieldGroup#InvoiceInfo'
    }
  ],

  // ── Field Group (General section) ──────────────────────────
  UI.FieldGroup #General: {
    Label: 'Order Details',
    Data: [
      { Value: orderNumber,   Label: 'Order Number'  },
      { Value: customerName,  Label: 'Customer'      },
      { Value: orderDate,     Label: 'Order Date'    },
      { Value: deliveryDate,  Label: 'Delivery Date' },
      { Value: status,        Label: 'Status'        },
      { Value: totalAmount,   Label: 'Total Amount'  },
      { Value: currency,      Label: 'Currency'      },
      { Value: notes,         Label: 'Notes'         }
    ]
  }
);

// ── SalesOrderItems Annotations ─────────────────────────────
annotate O2CService.SalesOrderItems with @(
  UI.LineItem: [
    { Value: lineNumber,   Label: '#'         },
    { Value: productName,  Label: 'Product'   },
    { Value: quantity,     Label: 'Qty'       },
    { Value: unitPrice,    Label: 'Unit Price'},
    { Value: discount,     Label: 'Disc %'    },
    { Value: lineTotal,    Label: 'Total'     }
  ],
  UI.HeaderInfo: {
    TypeName:       'Order Item',
    TypeNamePlural: 'Order Items',
    Title: { Value: productName }
  }
);

// ── Field Labels via Common.Label ────────────────────────────
annotate O2CService.SalesOrders with {
  orderNumber  @title: 'Order Number';
  customer     @title: 'Customer';
  orderDate    @title: 'Order Date';
  status       @title: 'Status';
  totalAmount  @title: 'Total Amount' @Measures.ISOCurrency: currency;
  salesRep     @title: 'Sales Representative';
}

// ── Value Helps ───────────────────────────────────────────────
annotate O2CService.SalesOrders with {
  customer @(
    Common.ValueList: {
      CollectionPath: 'Customers',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: customer_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'customerNumber' }
      ]
    },
    Common.ValueListWithFixedValues: false
  );
}

annotate O2CService.SalesOrderItems with {
  product @(
    Common.ValueList: {
      CollectionPath: 'Products',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: product_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'description' },
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: unitPrice, ValueListProperty: 'unitPrice' }
      ]
    }
  );
}
```

### 4.5 Fiori Elements App manifest.json

```json
{
  "_version": "1.65.0",
  "sap.app": {
    "id": "o2c.salesorders",
    "type": "application",
    "title": "Sales Orders",
    "description": "Order to Cash - Sales Orders",
    "dataSources": {
      "mainService": {
        "uri": "/api/o2c/",
        "type": "OData",
        "settings": {
          "annotations": ["annotation"],
          "odataVersion": "4.0"
        }
      },
      "annotation": {
        "uri": "/api/o2c/$metadata",
        "type": "ODataAnnotation"
      }
    }
  },
  "sap.ui": {
    "technology": "UI5",
    "icons": { "icon": "sap-icon://sales-order" },
    "deviceTypes": { "desktop": true, "tablet": true, "phone": true }
  },
  "sap.ui5": {
    "rootView": {
      "viewName": "sap.fe.templates.RootContainer",
      "type": "XML",
      "async": true,
      "id": "appRootView"
    },
    "dependencies": {
      "minUI5Version": "1.120.0",
      "libs": {
        "sap.fe.templates": {},
        "sap.ui.core": {},
        "sap.m": {},
        "sap.ui.layout": {}
      }
    },
    "models": {
      "": {
        "dataSource": "mainService",
        "settings": {
          "synchronizationMode": "None",
          "operationMode": "Server",
          "autoExpandSelect": true
        }
      },
      "i18n": {
        "type": "sap.ui.model.resource.ResourceModel",
        "settings": { "bundleName": "o2c.salesorders.i18n.i18n" }
      }
    },
    "routing": {
      "routes": [
        {
          "pattern": "",
          "name": "SalesOrdersList",
          "target": "SalesOrdersList"
        },
        {
          "pattern": "SalesOrders({key})",
          "name": "SalesOrdersObjectPage",
          "target": "SalesOrdersObjectPage"
        },
        {
          "pattern": "SalesOrders({key})/items({key2})",
          "name": "SalesOrderItemsObjectPage",
          "target": "SalesOrderItemsObjectPage"
        }
      ],
      "targets": {
        "SalesOrdersList": {
          "type": "Component",
          "id": "SalesOrdersList",
          "name": "sap.fe.templates.ListReport",
          "options": {
            "settings": {
              "entitySet": "SalesOrders",
              "variantManagement": "Page",
              "initialLoad": true,
              "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": {
                  "tableSettings": {
                    "type": "ResponsiveTable",
                    "selectionMode": "Multi",
                    "enableExport": true,
                    "enableFullScreen": true
                  }
                }
              }
            }
          }
        },
        "SalesOrdersObjectPage": {
          "type": "Component",
          "id": "SalesOrdersObjectPage",
          "name": "sap.fe.templates.ObjectPage",
          "options": {
            "settings": {
              "entitySet": "SalesOrders",
              "sectionLayout": "Page"
            }
          }
        },
        "SalesOrderItemsObjectPage": {
          "type": "Component",
          "id": "SalesOrderItemsObjectPage",
          "name": "sap.fe.templates.ObjectPage",
          "options": {
            "settings": {
              "entitySet": "SalesOrderItems"
            }
          }
        }
      }
    }
  }
}
```

---

## 5. Part C — Charts, Visualization & Analytical App

### 5.1 Overview Page (OVP) — manifest.json

```json
{
  "sap.app": {
    "id": "o2c.analytics",
    "title": "O2C Analytics Overview",
    "dataSources": {
      "analyticsService": {
        "uri": "/api/o2c/",
        "type": "OData",
        "settings": { "odataVersion": "4.0" }
      }
    }
  },
  "sap.ovp": {
    "globalFilterModel": "analyticsService",
    "globalFilterEntityType": "SalesOrders",
    "enableLiveFilter": true,
    "cards": {
      "revenueKPI": {
        "model": "analyticsService",
        "template": "sap.ovp.cards.v4.analyticalChart",
        "settings": {
          "title": "Revenue by Month",
          "subTitle": "Current Year",
          "entitySet": "OrderAnalytics",
          "chartAnnotationPath": "com.sap.vocabularies.UI.v1.Chart#revenueByMonth",
          "presentationAnnotationPath": "com.sap.vocabularies.UI.v1.PresentationVariant#revenueByMonth"
        }
      },
      "orderStatusCard": {
        "model": "analyticsService",
        "template": "sap.ovp.cards.v4.analyticalChart",
        "settings": {
          "title": "Orders by Status",
          "entitySet": "OrderAnalytics",
          "chartAnnotationPath": "com.sap.vocabularies.UI.v1.Chart#ordersByStatus"
        }
      },
      "topCustomers": {
        "model": "analyticsService",
        "template": "sap.ovp.cards.v4.list",
        "settings": {
          "title": "Top Customers",
          "entitySet": "Customers",
          "listFlavor": "bar",
          "sortBy": "creditLimit",
          "sortOrder": "descending",
          "listType": "extended"
        }
      },
      "recentOrders": {
        "model": "analyticsService",
        "template": "sap.ovp.cards.v4.table",
        "settings": {
          "title": "Recent Orders",
          "entitySet": "SalesOrders",
          "addODataSelect": true,
          "tableColumns": [
            { "name": "Order #",   "value": "orderNumber" },
            { "name": "Customer",  "value": "customerName" },
            { "name": "Total",     "value": "totalAmount" },
            { "name": "Status",    "value": "status" }
          ]
        }
      }
    }
  }
}
```

### 5.2 Chart Annotations (CDS)

```cds
// srv/analytics-annotations.cds
using O2CService from './o2c-service';

annotate O2CService.OrderAnalytics with @(

  // ── Revenue by Month — Bar Chart ─────────────────────────
  UI.Chart #revenueByMonth: {
    ChartType: #Bar,
    Title:     'Revenue by Month',
    Measures:  [ totalRevenue ],
    Dimensions: [ orderDate ],
    MeasureAttributes: [{
      Measure:   totalRevenue,
      Role:      #Axis1,
      DataPoint: '@UI.DataPoint#revenue'
    }],
    DimensionAttributes: [{
      Dimension: orderDate,
      Role:      #Category
    }]
  },

  UI.DataPoint #revenue: {
    Value: totalRevenue,
    Title: 'Revenue'
  },

  UI.PresentationVariant #revenueByMonth: {
    SortOrder: [{ Property: orderDate, Descending: false }],
    Visualizations: [ '@UI.Chart#revenueByMonth', '@UI.LineItem' ]
  },

  // ── Orders by Status — Donut Chart ───────────────────────
  UI.Chart #ordersByStatus: {
    ChartType: #Donut,
    Title:     'Orders by Status',
    Measures:  [ orderCount ],
    Dimensions: [ status ],
    MeasureAttributes: [{
      Measure: orderCount,
      Role:    #Axis1
    }],
    DimensionAttributes: [{
      Dimension: status,
      Role:      #Category
    }]
  }
);
```

### 5.3 Custom Analytics View (viz/VizFrame)

```xml
<!-- app/analytics/webapp/view/Analytics.view.xml -->
<mvc:View
  controllerName="o2c.analytics.controller.Analytics"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  xmlns:viz="sap.viz.ui5.controls"
  xmlns:feeds="sap.viz.ui5.controls.common.feeds"
  xmlns:vizData="sap.viz.ui5.data"
  xmlns:l="sap.ui.layout"
  xmlns:core="sap.ui.core"
  displayBlock="true">

  <Page title="Order to Cash Analytics" showNavButton="true" navButtonPress="onNavBack">

    <content>
      <l:Grid defaultSpan="L6 M6 S12" hSpacing="1" vSpacing="1" class="sapUiSmallMargin">

        <!-- KPI Tiles Row -->
        <GenericTile class="sapUiTinyMarginBegin sapUiTinyMarginTop tileLayout"
          header="Total Revenue" subheader="This Month" press="onKpiPress">
          <tileContent>
            <TileContent unit="USD">
              <content>
                <NumericContent
                  value="{analytics>/totalRevenue}"
                  scale="K"
                  indicator="Up"
                  valueColor="Good" />
              </content>
            </TileContent>
          </tileContent>
        </GenericTile>

        <GenericTile header="Open Orders" subheader="Pending Approval">
          <tileContent>
            <TileContent>
              <content>
                <NumericContent
                  value="{analytics>/openOrders}"
                  valueColor="Critical" />
              </content>
            </TileContent>
          </tileContent>
        </GenericTile>

        <GenericTile header="Invoiced" subheader="Awaiting Payment">
          <tileContent>
            <TileContent>
              <content>
                <NumericContent
                  value="{analytics>/invoicedOrders}"
                  valueColor="Neutral" />
              </content>
            </TileContent>
          </tileContent>
        </GenericTile>

        <GenericTile header="Collected" subheader="Paid This Month">
          <tileContent>
            <TileContent>
              <content>
                <NumericContent
                  value="{analytics>/paidOrders}"
                  valueColor="Good" />
              </content>
            </TileContent>
          </tileContent>
        </GenericTile>

      </l:Grid>

      <!-- Revenue Bar Chart (VizFrame) -->
      <Panel headerText="Monthly Revenue" class="sapUiSmallMargin">
        <viz:Popover id="revenuePopover" />
        <viz:VizFrame
          id="revenueChart"
          width="100%"
          height="300px"
          vizType="bar"
          uiConfig="{applicationSet:'fiori'}">

          <viz:dataset>
            <vizData:FlattenedDataset data="{analytics>/monthlyRevenue}">
              <vizData:dimensions>
                <vizData:DimensionDefinition name="Month"  value="{month}" />
              </vizData:dimensions>
              <vizData:measures>
                <vizData:MeasureDefinition name="Revenue" value="{revenue}" />
                <vizData:MeasureDefinition name="Orders"  value="{orderCount}" />
              </vizData:measures>
            </vizData:FlattenedDataset>
          </viz:dataset>

          <viz:feeds>
            <feeds:FeedItem uid="valueAxis" type="Measure"    values="Revenue" />
            <feeds:FeedItem uid="categoryAxis" type="Dimension" values="Month" />
          </viz:feeds>
        </viz:VizFrame>
      </Panel>

      <!-- Status Donut Chart -->
      <Panel headerText="Order Status Distribution" class="sapUiSmallMargin">
        <viz:VizFrame
          id="statusChart"
          width="100%"
          height="300px"
          vizType="donut">
          <viz:dataset>
            <vizData:FlattenedDataset data="{analytics>/statusData}">
              <vizData:dimensions>
                <vizData:DimensionDefinition name="Status" value="{status}" />
              </vizData:dimensions>
              <vizData:measures>
                <vizData:MeasureDefinition name="Count" value="{orderCount}" />
              </vizData:measures>
            </vizData:FlattenedDataset>
          </viz:dataset>
          <viz:feeds>
            <feeds:FeedItem uid="size"  type="Measure"   values="Count" />
            <feeds:FeedItem uid="color" type="Dimension" values="Status" />
          </viz:feeds>
        </viz:VizFrame>
      </Panel>

    </content>
  </Page>
</mvc:View>
```

### 5.4 Analytics Controller

```javascript
// app/analytics/webapp/controller/Analytics.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/viz/ui5/controls/Popover"
], function (Controller, JSONModel, Popover) {
  "use strict";

  return Controller.extend("o2c.analytics.controller.Analytics", {

    onInit: function () {
      const oModel = new JSONModel({
        totalRevenue: 0,
        openOrders: 0,
        invoicedOrders: 0,
        paidOrders: 0,
        monthlyRevenue: [],
        statusData: []
      });
      this.getView().setModel(oModel, "analytics");
      this._loadAnalyticsData();
      this._connectVizPopover();
    },

    _loadAnalyticsData: async function () {
      const oModel = this.getView().getModel("analytics");

      try {
        // Revenue by month
        const monthlyRes = await fetch("/api/o2c/revenueByMonth(year=2024)");
        const monthlyData = await monthlyRes.json();
        const months = ["Jan","Feb","Mar","Apr","May","Jun",
                        "Jul","Aug","Sep","Oct","Nov","Dec"];
        const monthlyRevenue = (monthlyData.value || []).map(m => ({
          month: months[m.month - 1],
          revenue: m.revenue,
          orderCount: m.orderCount
        }));
        oModel.setProperty("/monthlyRevenue", monthlyRevenue);

        const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
        oModel.setProperty("/totalRevenue", Math.round(totalRevenue / 1000));

        // Status data
        const statusRes = await fetch("/api/o2c/OrderAnalytics?$select=status,orderCount");
        const statusData = await statusRes.json();
        oModel.setProperty("/statusData", statusData.value || []);

        // KPI counts
        const ordersRes = await fetch(
          "/api/o2c/SalesOrders?$apply=groupby((status),aggregate($count as cnt))"
        );
        const ordersData = await ordersRes.json();
        const statusMap = {};
        (ordersData.value || []).forEach(s => { statusMap[s.status] = s.cnt; });
        oModel.setProperty("/openOrders", statusMap['Submitted'] || 0);
        oModel.setProperty("/invoicedOrders", statusMap['Invoiced'] || 0);
        oModel.setProperty("/paidOrders", statusMap['Paid'] || 0);

      } catch (e) {
        console.error("Analytics load failed:", e);
      }
    },

    _connectVizPopover: function () {
      const oPopover = this.byId("revenuePopover");
      const oChart   = this.byId("revenueChart");
      if (oPopover && oChart) {
        oPopover.connect(oChart.getVizUid());
      }
    },

    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("Overview");
    }
  });
});
```

---

## 6. Part D — Advanced UI5 Patterns

### 6.1 Fragments

#### Create Order Fragment (form dialog)

```xml
<!-- app/advanced/webapp/fragment/CreateOrder.fragment.xml -->
<core:FragmentDefinition
  xmlns="sap.m"
  xmlns:core="sap.ui.core"
  xmlns:f="sap.ui.layout.form">

  <Dialog
    id="createOrderDialog"
    title="Create Sales Order"
    contentWidth="600px"
    draggable="true"
    resizable="true">

    <content>
      <f:SimpleForm
        id="createOrderForm"
        editable="true"
        layout="ColumnLayout">
        <f:content>

          <Label text="Customer" required="true" />
          <Input id="customerInput"
            value="{dialog>/customerName}"
            showValueHelp="true"
            valueHelpRequest="onCustomerVH"
            placeholder="Select Customer..." />

          <Label text="Delivery Date" />
          <DatePicker id="deliveryDatePicker"
            value="{dialog>/deliveryDate}"
            valueFormat="yyyy-MM-dd"
            displayFormat="medium"
            minDate="{= new Date()}" />

          <Label text="Notes" />
          <TextArea id="notesInput"
            value="{dialog>/notes}"
            rows="3"
            growing="true"
            maxLength="500" />

          <Label text="Currency" />
          <Select id="currencySelect" selectedKey="{dialog>/currency}">
            <core:Item key="USD" text="USD — US Dollar" />
            <core:Item key="EUR" text="EUR — Euro" />
            <core:Item key="GBP" text="GBP — British Pound" />
            <core:Item key="INR" text="INR — Indian Rupee" />
          </Select>

        </f:content>
      </f:SimpleForm>
    </content>

    <beginButton>
      <Button text="Create" type="Emphasized" press="onCreateOrderConfirm" />
    </beginButton>
    <endButton>
      <Button text="Cancel" press="onCreateOrderCancel" />
    </endButton>

  </Dialog>
</core:FragmentDefinition>
```

#### Status Filter Fragment

```xml
<!-- app/advanced/webapp/fragment/StatusFilter.fragment.xml -->
<core:FragmentDefinition
  xmlns="sap.m"
  xmlns:core="sap.ui.core">

  <ViewSettingsDialog
    id="statusFilterDialog"
    confirm="onFilterConfirm"
    reset="onFilterReset">

    <filterItems>
      <ViewSettingsFilterItem key="status" text="Status" multiSelect="true">
        <items>
          <ViewSettingsItem key="Draft"      text="Draft"       />
          <ViewSettingsItem key="Submitted"  text="Submitted"   />
          <ViewSettingsItem key="Approved"   text="Approved"    />
          <ViewSettingsItem key="Rejected"   text="Rejected"    />
          <ViewSettingsItem key="Invoiced"   text="Invoiced"    />
          <ViewSettingsItem key="Paid"       text="Paid"        />
          <ViewSettingsItem key="Cancelled"  text="Cancelled"   />
        </items>
      </ViewSettingsFilterItem>
    </filterItems>

    <sortItems>
      <ViewSettingsItem key="orderDate"   text="Order Date"   selected="true" />
      <ViewSettingsItem key="totalAmount" text="Total Amount" />
      <ViewSettingsItem key="customerName" text="Customer"    />
    </sortItems>

  </ViewSettingsDialog>
</core:FragmentDefinition>
```

#### Fragment usage in controller

```javascript
// Fragment loading pattern
onOpenCreateDialog: async function () {
  if (!this._oCreateDialog) {
    this._oCreateDialog = await this.loadFragment({
      name: "o2c.advanced.fragment.CreateOrder"
    });
    // Set a dedicated dialog model
    const oDialogModel = new JSONModel({
      customerName: "",
      customerId: "",
      deliveryDate: "",
      notes: "",
      currency: "USD"
    });
    this._oCreateDialog.setModel(oDialogModel, "dialog");
  }
  this._oCreateDialog.open();
},

onCreateOrderConfirm: async function () {
  const oDialogModel = this._oCreateDialog.getModel("dialog");
  const oData = oDialogModel.getData();
  // validate & submit via OData V4 binding
  const oListBinding = this.getView().getModel().bindList("/SalesOrders");
  await oListBinding.create({
    customer_ID: oData.customerId,
    deliveryDate: oData.deliveryDate,
    notes: oData.notes,
    currency: oData.currency
  });
  this._oCreateDialog.close();
},

onCreateOrderCancel: function () {
  this._oCreateDialog.close();
},

onOpenFilter: async function () {
  if (!this._oFilterDialog) {
    this._oFilterDialog = await this.loadFragment({
      name: "o2c.advanced.fragment.StatusFilter"
    });
  }
  this._oFilterDialog.open();
}
```

### 6.2 XML Composite Control

```xml
<!-- app/advanced/webapp/control/OrderSummaryCard.control.xml -->
<core:FragmentDefinition
  xmlns="sap.m"
  xmlns:core="sap.ui.core">

  <VBox class="sapUiSmallMargin">
    <ObjectHeader
      title="{$this>orderNumber}"
      number="{$this>totalAmount}"
      numberUnit="{$this>currency}"
      numberState="{= ${$this>status} === 'Paid' ? 'Success' :
                      ${$this>status} === 'Rejected' ? 'Error' : 'None' }">
      <attributes>
        <ObjectAttribute title="Customer" text="{$this>customerName}" />
        <ObjectAttribute title="Date"     text="{$this>orderDate}"    />
        <ObjectAttribute title="Rep"      text="{$this>salesRep}"     />
      </attributes>
      <statuses>
        <ObjectStatus
          text="{$this>status}"
          state="{= ${$this>status} === 'Approved' ? 'Success' :
                   ${$this>status} === 'Rejected'  ? 'Error'   :
                   ${$this>status} === 'Submitted'  ? 'Warning' : 'None'}" />
      </statuses>
    </ObjectHeader>
  </VBox>
</core:FragmentDefinition>
```

```javascript
// app/advanced/webapp/control/OrderSummaryCard.js
sap.ui.define([
  "sap/ui/core/XMLComposite"
], function (XMLComposite) {
  "use strict";

  return XMLComposite.extend("o2c.advanced.control.OrderSummaryCard", {
    metadata: {
      compositeMetadata: {
        xmlFragment: "o2c.advanced.control.OrderSummaryCard"
      },
      properties: {
        orderNumber:  { type: "string",  defaultValue: "" },
        customerName: { type: "string",  defaultValue: "" },
        totalAmount:  { type: "float",   defaultValue: 0  },
        currency:     { type: "string",  defaultValue: "USD" },
        status:       { type: "string",  defaultValue: "Draft" },
        orderDate:    { type: "string",  defaultValue: "" },
        salesRep:     { type: "string",  defaultValue: "" }
      },
      events: {
        press: {}
      }
    }
  });
});
```

### 6.3 Custom Control — StatusBadge

```javascript
// app/advanced/webapp/control/StatusBadge.js
sap.ui.define([
  "sap/ui/core/Control",
  "sap/ui/core/library"
], function (Control, coreLibrary) {
  "use strict";

  const StatusBadge = Control.extend("o2c.advanced.control.StatusBadge", {
    metadata: {
      properties: {
        status:   { type: "string", defaultValue: "Draft" },
        showIcon: { type: "boolean", defaultValue: true }
      },
      events: {
        press: {}
      }
    },

    // ── Renderer ─────────────────────────────────────────────
    renderer: {
      apiVersion: 2,
      render: function (oRm, oControl) {
        const sStatus  = oControl.getStatus();
        const bIcon    = oControl.getShowIcon();
        const oConfig  = StatusBadge._statusConfig[sStatus] || StatusBadge._statusConfig["Draft"];

        oRm.openStart("div", oControl);
        oRm.class("o2cStatusBadge");
        oRm.class(`o2cStatusBadge--${oConfig.cssClass}`);
        oRm.attr("role", "status");
        oRm.attr("aria-label", `Status: ${sStatus}`);
        oRm.openEnd();

        if (bIcon) {
          oRm.openStart("span");
          oRm.class("o2cStatusBadge__icon");
          oRm.openEnd();
          oRm.text(oConfig.icon);
          oRm.close("span");
        }

        oRm.openStart("span");
        oRm.class("o2cStatusBadge__text");
        oRm.openEnd();
        oRm.text(sStatus);
        oRm.close("span");

        oRm.close("div");
      }
    },

    ontap: function (oEvent) {
      this.firePress({ status: this.getStatus() });
    }
  });

  // ── Static config map ─────────────────────────────────────
  StatusBadge._statusConfig = {
    "Draft":      { cssClass: "draft",      icon: "⬜" },
    "Submitted":  { cssClass: "submitted",  icon: "🔵" },
    "Approved":   { cssClass: "approved",   icon: "✅" },
    "Rejected":   { cssClass: "rejected",   icon: "❌" },
    "InDelivery": { cssClass: "delivery",   icon: "🚚" },
    "Invoiced":   { cssClass: "invoiced",   icon: "📄" },
    "Paid":       { cssClass: "paid",       icon: "💰" },
    "Cancelled":  { cssClass: "cancelled",  icon: "🚫" }
  };

  return StatusBadge;
});
```

```css
/* app/advanced/webapp/css/StatusBadge.css */
.o2cStatusBadge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.6rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: default;
}
.o2cStatusBadge--draft      { background: #f0f0f0; color: #666; }
.o2cStatusBadge--submitted  { background: #ddeeff; color: #0050b3; }
.o2cStatusBadge--approved   { background: #d4edda; color: #155724; }
.o2cStatusBadge--rejected   { background: #f8d7da; color: #721c24; }
.o2cStatusBadge--delivery   { background: #fff3cd; color: #856404; }
.o2cStatusBadge--invoiced   { background: #e2e3e5; color: #383d41; }
.o2cStatusBadge--paid       { background: #c3e6cb; color: #155724; }
.o2cStatusBadge--cancelled  { background: #f5c6cb; color: #491217; }
```

### 6.4 Extending sap.m.Table — ExtendedTable

```javascript
// app/advanced/webapp/control/ExtendedTable.js
sap.ui.define([
  "sap/m/Table",
  "sap/m/ToolbarSpacer",
  "sap/m/Button",
  "sap/m/Toolbar"
], function (Table, ToolbarSpacer, Button, Toolbar) {
  "use strict";

  return Table.extend("o2c.advanced.control.ExtendedTable", {
    metadata: {
      properties: {
        exportEnabled:   { type: "boolean", defaultValue: true },
        refreshEnabled:  { type: "boolean", defaultValue: true },
        totalCount:      { type: "int",     defaultValue: 0   }
      },
      events: {
        exportPress:   {},
        refreshPress:  {}
      }
    },

    init: function () {
      Table.prototype.init.apply(this, arguments);
      this._buildExtendedToolbar();
    },

    _buildExtendedToolbar: function () {
      const oExportBtn = new Button({
        icon: "sap-icon://excel-attachment",
        tooltip: "Export to Excel",
        visible: this.getExportEnabled(),
        press: () => this.fireExportPress()
      });

      const oRefreshBtn = new Button({
        icon: "sap-icon://refresh",
        tooltip: "Refresh",
        visible: this.getRefreshEnabled(),
        press: () => this.fireRefreshPress()
      });

      const oExistingToolbar = this.getHeaderToolbar();
      if (oExistingToolbar) {
        oExistingToolbar.addContent(new ToolbarSpacer());
        oExistingToolbar.addContent(oExportBtn);
        oExistingToolbar.addContent(oRefreshBtn);
      } else {
        this.setHeaderToolbar(new Toolbar({
          content: [
            new ToolbarSpacer(),
            oExportBtn,
            oRefreshBtn
          ]
        }));
      }

      this._oExportBtn  = oExportBtn;
      this._oRefreshBtn = oRefreshBtn;
    },

    setExportEnabled: function (bEnabled) {
      this.setProperty("exportEnabled", bEnabled, true);
      if (this._oExportBtn) this._oExportBtn.setVisible(bEnabled);
      return this;
    },

    setRefreshEnabled: function (bEnabled) {
      this.setProperty("refreshEnabled", bEnabled, true);
      if (this._oRefreshBtn) this._oRefreshBtn.setVisible(bEnabled);
      return this;
    }
  });
});
```

### 6.5 UI5 Library

```javascript
// app/advanced/webapp/library/library.js
sap.ui.define([
  "sap/ui/core/library"
], function () {
  "use strict";

  sap.ui.getCore().initLibrary({
    name: "o2c.lib",
    version: "1.0.0",
    dependencies: ["sap.ui.core", "sap.m"],
    types: [
      "o2c.lib.OrderStatus"
    ],
    controls: [
      "o2c.lib.control.OrderCard",
      "o2c.lib.control.StatusBadge"
    ],
    noLibraryCSS: false
  });

  // Enum type for order status
  o2c.lib.OrderStatus = {
    Draft:      "Draft",
    Submitted:  "Submitted",
    Approved:   "Approved",
    Rejected:   "Rejected",
    Invoiced:   "Invoiced",
    Paid:       "Paid",
    Cancelled:  "Cancelled"
  };

  return o2c.lib;
});
```

### 6.6 Mock Server

```javascript
// app/analytics/webapp/localService/mockserver.js
sap.ui.define([
  "sap/ui/core/util/MockServer"
], function (MockServer) {
  "use strict";

  return {
    init: function () {
      // Create mock server for O2C service
      const oMockServer = new MockServer({
        rootUri: "/api/o2c/"
      });

      MockServer.config({
        autoRespond: true,
        autoRespondAfter: 200  // ms delay to simulate latency
      });

      oMockServer.simulate(
        "./localService/metadata.xml",
        {
          sMockdataBaseUrl: "./localService/mockdata",
          bGenerateMissingMockData: true
        }
      );

      // Custom request handler — override revenueByMonth
      const aRequests = oMockServer.getRequests();
      aRequests.push({
        method: "GET",
        path: /revenueByMonth\(year=(\d+)\)/,
        response: function (oXhr, sYear) {
          const months = ["Jan","Feb","Mar","Apr","May","Jun",
                          "Jul","Aug","Sep","Oct","Nov","Dec"];
          const data = months.map((m, i) => ({
            month: i + 1,
            revenue: Math.round(Math.random() * 500000 + 100000),
            orderCount: Math.round(Math.random() * 50 + 10)
          }));
          oXhr.respondJSON(200, {}, { value: data });
        }
      });

      oMockServer.setRequests(aRequests);
      oMockServer.start();

      console.log("O2C Mock Server started at /api/o2c/");
    }
  };
});
```

```javascript
// app/analytics/webapp/test/mockServer.html  (for local dev)
// In Component.js, conditionally start mock server:
init: function () {
  UIComponent.prototype.init.apply(this, arguments);

  const oUriParams = new URLSearchParams(window.location.search);
  if (oUriParams.get("sap-ui-xx-viewCache") !== "true") {
    // Auto-detect mock mode from URL param ?mockData=true
    if (oUriParams.get("mockData") === "true") {
      sap.ui.require(["o2c/analytics/localService/mockserver"], m => m.init());
    }
  }

  this.getRouter().initialize();
}
```

---

## 7. Full User Flow Walkthrough

### 7.1 End-to-End Process

```
 ┌─────────────────────────────────────────────────────────────────┐
 │  ACTOR         ACTION                     SYSTEM RESPONSE        │
 ├─────────────────────────────────────────────────────────────────┤
 │  SalesRep  →  Login via XSUAA             JWT with SalesRep role │
 │            →  Open Sales Orders List      Filtered to own orders │
 │            →  Click "Create Order"        CreateOrder dialog opens│
 │            →  Select Customer (VH)        Customer VH F4 dialog  │
 │            →  Add items (product VH)      Line totals calculated  │
 │            →  Save (Draft)                POST /SalesOrders       │
 │            →  Click "Submit"              PATCH status=Submitted  │
 ├─────────────────────────────────────────────────────────────────┤
 │  SalesMgr  →  Open Submitted Orders       Filtered by status     │
 │            →  Review order details        Object page with items  │
 │            →  Click "Approve"             Action: approveOrder    │
 │            →  OR Click "Reject"           Reject dialog + reason  │
 ├─────────────────────────────────────────────────────────────────┤
 │  SalesMgr  →  Click "Create Invoice"      Action: createInvoice  │
 │               (on Approved order)         Invoice auto-generated  │
 ├─────────────────────────────────────────────────────────────────┤
 │  Finance   →  Open Invoices List          All open invoices      │
 │            →  Click "Record Payment"      Payment dialog          │
 │            →  Enter amount + method       POST /Payments          │
 │            →  Invoice auto-status update  Paid / PartiallyPaid   │
 ├─────────────────────────────────────────────────────────────────┤
 │  Manager   →  Open Analytics Dashboard    OVP with KPI cards     │
 │  / Admin      View revenue charts         VizFrame bar chart      │
 │               View status donut           Status distribution     │
 │               Top customers list          Sorted by credit        │
 └─────────────────────────────────────────────────────────────────┘
```

### 7.2 Status State Machine

```
                    ┌─────────┐
                    │  Draft  │
                    └────┬────┘
                         │ submit()
                    ┌────▼──────┐
                    │ Submitted │
                    └────┬──────┘
              ┌──────────┴──────────┐
          approve()            reject()
       ┌────▼─────┐          ┌───▼────┐
       │ Approved │          │Rejected│
       └────┬─────┘          └────────┘
            │ createInvoice()
       ┌────▼──────┐
       │ Invoiced  │
       └────┬──────┘
            │ recordPayment() [full]
       ┌────▼──┐
       │  Paid │
       └───────┘

       Any state → cancel() → [Cancelled]
```

---

## 8. Deployment & MTA Configuration

### 8.1 mta.yaml

```yaml
_schema-version: "3.1"
ID: o2c-cap-project
description: Order to Cash CAP Full Stack
version: 1.0.0

modules:
  # ── CAP Backend ──────────────────────────────────────────────
  - name: o2c-srv
    type: nodejs
    path: gen/srv
    parameters:
      buildpack: nodejs_buildpack
      memory: 512M
    build-parameters:
      builder: npm-ci
    properties:
      EXIT: 1
    requires:
      - name: o2c-db
      - name: o2c-xsuaa
      - name: o2c-destination
    provides:
      - name: o2c-srv-api
        properties:
          srv-url: ${default-url}

  # ── HANA Deployer ────────────────────────────────────────────
  - name: o2c-db-deployer
    type: hdb
    path: gen/db
    requires:
      - name: o2c-db
    parameters:
      buildpack: nodejs_buildpack

  # ── App Router ───────────────────────────────────────────────
  - name: o2c-approuter
    type: approuter.nodejs
    path: app/router
    parameters:
      memory: 256M
    requires:
      - name: o2c-xsuaa
      - name: o2c-destination
      - name: o2c-html5-runtime
      - name: o2c-srv-api
        group: destinations
        properties:
          name: o2c-srv-api
          url: ~{srv-url}
          forwardAuthToken: true

resources:
  # ── XSUAA ────────────────────────────────────────────────────
  - name: o2c-xsuaa
    type: org.cloudfoundry.managed-service
    parameters:
      service: xsuaa
      service-plan: application
      path: ./xs-security.json
      config:
        xsappname: o2c-cap-app-${org}-${space}
        tenant-mode: dedicated

  # ── HANA Cloud ───────────────────────────────────────────────
  - name: o2c-db
    type: com.sap.xs.hdi-container
    parameters:
      service: hana
      service-plan: hdi-shared

  # ── Destination Service ──────────────────────────────────────
  - name: o2c-destination
    type: org.cloudfoundry.managed-service
    parameters:
      service: destination
      service-plan: lite

  # ── HTML5 App Runtime ────────────────────────────────────────
  - name: o2c-html5-runtime
    type: org.cloudfoundry.managed-service
    parameters:
      service: html5-apps-repo
      service-plan: app-runtime
```

### 8.2 package.json

```json
{
  "name": "o2c-cap-project",
  "version": "1.0.0",
  "description": "Order to Cash CAP Full Stack",
  "scripts": {
    "start":   "cds-serve",
    "watch":   "cds watch",
    "build":   "mbt build",
    "deploy":  "cf deploy mta_archives/o2c-cap-project_1.0.0.mtar",
    "test":    "jest --testPathPattern=test/",
    "lint":    "eslint srv app --ext .js,.cds"
  },
  "dependencies": {
    "@sap/cds":              "^7.0.0",
    "@sap/xssec":            "^3.0.0",
    "passport":              "^0.6.0",
    "hdb":                   "^0.19.0",
    "@sap/hana-client":      "^2.18.0"
  },
  "devDependencies": {
    "@sap/cds-dk":           "^7.0.0",
    "@sap-ux/eslint-plugin-fiori-tools": "^0.9.0",
    "jest":                  "^29.0.0",
    "@sap/cds-typer":        "^0.21.0"
  },
  "cds": {
    "requires": {
      "auth": { "kind": "xsuaa" },
      "db":   { "kind": "hana",
                "[development]": { "kind": "sqlite" } }
    }
  }
}
```

### 8.3 CSV Seed Data

```csv
-- db/data/o2c-Customers.csv
ID,customerNumber,name,email,phone,creditLimit,country
c001,CUST-001,Acme Corp,acme@example.com,+1-555-0100,500000.00,US
c002,CUST-002,Global Tech,info@globaltech.com,+44-20-0001,750000.00,GB
c003,CUST-003,Tata Enterprises,tata@example.in,+91-80-0001,1000000.00,IN
```

```csv
-- db/data/o2c-Products.csv
ID,productCode,description,unitPrice,stockQuantity,category,currency
p001,PROD-001,Enterprise Software License,50000.00,999,Software,USD
p002,PROD-002,Annual Support Contract,12000.00,999,Services,USD
p003,PROD-003,Professional Services Day Rate,1500.00,999,Services,USD
p004,PROD-004,Hardware Server Unit,8000.00,50,Hardware,USD
```

---

## 9. End-to-End Codex Prompt Checklist

> Use this section as the literal prompt to give to GitHub Copilot, Codex, or Claude to generate each component.

---

### PROMPT BLOCK A — Project Scaffold

```
Create a SAP CAP Node.js project called "o2c-cap-project" with:
1. cds init with folders: db/, srv/, app/
2. Install: @sap/cds, @sap/xssec, passport, sqlite3
3. Create .cdsrc.json with sqlite for dev, mocked auth with users: 
   alice (SalesRep), bob (SalesManager), carol (FinanceUser), admin (Admin)
4. Create db/schema.cds with entities: Customers, Products, 
   SalesOrders (with status enum), SalesOrderItems, Invoices, Payments
5. Create CSV seed data for all entities (5 rows each)
6. Run: cds deploy --to sqlite && cds watch
```

---

### PROMPT BLOCK B — OData V4 Service + Annotations

```
In the o2c-cap-project, create srv/o2c-service.cds:
1. Define service O2CService at /api/o2c
2. Expose all entities as projections with computed fields 
   (customerName from association, productName from association)
3. Add bound actions: submitOrder, approveOrder, rejectOrder(reason), 
   createInvoice on SalesOrders
4. Add bound action recordPayment(amount, method, reference) on Invoices
5. Add unbound functions: topCustomers(limit), revenueByMonth(year)
6. Create srv/annotations.cds with:
   - UI.LineItem for SalesOrders (8 columns including status with Criticality)
   - UI.SelectionFields: status, orderDate, customer, salesRep
   - UI.HeaderInfo with TypeName and Title
   - UI.Facets: General FieldGroup + Items table + Invoice section
   - UI.Chart#revenueByMonth (Bar) and UI.Chart#ordersByStatus (Donut)
   - Common.ValueList for customer and product associations
7. Create srv/o2c-service.js with handlers for all actions/functions
   including before hooks for auto-numbering and total calculation
```

---

### PROMPT BLOCK C — Fiori Elements App

```
Create a Fiori Elements app in app/salesorders/ for the O2CService:
1. manifest.json targeting OData V4 at /api/o2c/
2. ListReport page for SalesOrders entity:
   - ResponsiveTable with multi-select, export enabled
   - Selection fields from annotations
3. ObjectPage for SalesOrders:
   - Header with orderNumber as title, status ObjectStatus
   - Items table as embedded section using composition
   - Action buttons: Submit, Approve, Reject (role-gated)
4. ObjectPage for SalesOrderItems with inline create
5. Connect to user-api for role-based button visibility
6. i18n/i18n.properties for all labels
```

---

### PROMPT BLOCK D — Analytics App

```
Create a freestyle SAPUI5 app in app/analytics/ with:
1. Overview page with 4 GenericTile KPI cards:
   Total Revenue, Open Orders, Invoiced, Paid (with color coding)
2. Analytics page with:
   - sap.viz.ui5.controls.VizFrame bar chart for monthly revenue
   - sap.viz.ui5.controls.VizFrame donut chart for status distribution
   - VizPopover connected to bar chart
3. Analytics controller that fetches data from:
   - /api/o2c/revenueByMonth(year=YYYY)
   - /api/o2c/SalesOrders with $apply groupby aggregation
4. localService/mockserver.js that:
   - Simulates metadata.xml
   - Provides custom handler for revenueByMonth with random data
   - Activated by URL parameter ?mockData=true
5. OVP manifest with 4 cards using sap.ovp templates
```

---

### PROMPT BLOCK E — Advanced UI5 Patterns

```
In app/advanced/ create the following:
1. FRAGMENTS:
   - fragment/CreateOrder.fragment.xml: Dialog with SimpleForm for 
     customer (with value help), delivery date (DatePicker), notes, currency
   - fragment/StatusFilter.fragment.xml: ViewSettingsDialog with 
     filter items for all 7 statuses + sort by date/amount/customer
   - Controller methods: onOpenCreateDialog (lazy load), 
     onCreateOrderConfirm (OData V4 create binding), onOpenFilter

2. XML COMPOSITE CONTROL:
   - control/OrderSummaryCard.control.xml with ObjectHeader 
     showing orderNumber, customerName, totalAmount, status
   - control/OrderSummaryCard.js extending sap.ui.core.XMLComposite
     with 7 properties and press event

3. CUSTOM CONTROL (renderer API v2):
   - control/StatusBadge.js extending sap.ui.core.Control
   - Custom renderer with colored badge div + icon + text
   - Static config map for 8 statuses with CSS class and emoji icon
   - StatusBadge.css with color tokens for each status
   - press event, showIcon property

4. EXTENDED CONTROL:
   - control/ExtendedTable.js extending sap.m.Table
   - Adds Export to Excel button and Refresh button to header toolbar
   - exportEnabled and refreshEnabled properties
   - exportPress and refreshPress events

5. LIBRARY:
   - library/library.js declaring o2c.lib with controls and type enum
   - Registers OrderStatus enum type
   - Lists all library controls
```

---

### PROMPT BLOCK F — XSUAA + Deployment

```
Complete the security and deployment setup for o2c-cap-project:
1. xs-security.json with:
   - 8 scopes (SalesOrder CRUD, Invoice CRUD, Payment.Read, Admin)
   - 4 role-templates: SalesRep, SalesManager, FinanceUser, Admin
   - 4 role-collections prefixed O2C_
2. xs-app.json for App Router:
   - Routes for /salesorders/, /analytics/, /advanced/
   - API route to o2c-srv-api destination with CSRF protection
   - /user-api/currentUser route
   - Logout configuration
3. srv/auth/roles.cds with @restrict annotations for all entities
4. mta.yaml with modules: o2c-srv, o2c-db-deployer, o2c-approuter
   and resources: xsuaa, hana HDI, destination, html5-runtime
5. Component.js for salesorders app that:
   - Fetches /user-api/currentUser on init
   - Creates user JSONModel with boolean flags: 
     isSalesRep, isSalesManager, isFinanceUser, isAdmin, canApprove, canDelete
6. Example XML snippet showing conditional button visibility 
   using expression binding on user model
```

---

*End of SAP CAP Order-to-Cash Full Stack Implementation Guide*
*Version 1.0 | Generated for Codex/Claude Prompting*

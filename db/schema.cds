namespace o2c;

using { cuid, managed } from '@sap/cds/common';

type SalesOrderStatus : String(20) enum {
  Draft;
  Submitted;
  Approved;
  Rejected;
  InDelivery;
  Invoiced;
  Paid;
  Cancelled;
}

type InvoiceStatus : String(20) enum {
  Open;
  PartiallyPaid;
  Paid;
  Overdue;
  Cancelled;
}

entity Customers : cuid, managed {
  customerNumber : String(20)  @mandatory;
  name           : String(100) @mandatory;
  email          : String(100);
  phone          : String(30);
  creditLimit    : Decimal(15,2);
  country        : String(3);
  blocked        : Boolean default false;
  blockReason    : String(500);
  orders         : Association to many SalesOrders on orders.customer = $self;
}

entity Products : cuid, managed {
  productCode    : String(20)  @mandatory;
  description    : String(200) @mandatory;
  unitPrice      : Decimal(15,2) @mandatory;
  stockQuantity  : Integer;
  category       : String(50);
  currency       : String(3) default 'USD';
}

entity SalesOrders : cuid, managed {
  orderNumber    : String(20);
  customer       : Association to Customers @mandatory;
  orderDate      : Date;
  deliveryDate   : Date;
  status         : SalesOrderStatus default 'Draft';
  totalAmount    : Decimal(15,2) default 0;
  currency       : String(3) default 'USD';
  salesRep       : String(100);
  notes          : String(500);
  items          : Composition of many SalesOrderItems on items.order = $self;
  invoice        : Association to Invoices;
}

entity SalesOrderItems : cuid {
  order          : Association to SalesOrders;
  lineNumber     : Integer;
  product        : Association to Products @mandatory;
  quantity       : Integer @mandatory @assert.range: [1, 9999];
  unitPrice      : Decimal(15,2);
  discount       : Decimal(5,2) default 0;
  lineTotal      : Decimal(15,2);
}

entity Invoices : cuid, managed {
  invoiceNumber  : String(20);
  salesOrder     : Association to SalesOrders @mandatory;
  invoiceDate    : Date;
  dueDate        : Date;
  status         : InvoiceStatus default 'Open';
  totalAmount    : Decimal(15,2);
  currency       : String(3) default 'USD';
  payments       : Composition of many Payments on payments.invoice = $self;
}

entity Payments : cuid, managed {
  invoice        : Association to Invoices;
  paymentDate    : Date;
  amount         : Decimal(15,2);
  method         : String(30);
  reference      : String(50);
}

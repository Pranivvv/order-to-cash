using { o2c } from '../db/schema';

service O2CService @(path: '/api/o2c') {
  entity Customers as projection on o2c.Customers
    actions {
      action blockCustomer(reason: String) returns Customers;
    };

  @readonly
  entity Products as projection on o2c.Products
    actions {
      action addStock(quantity: Integer, reference: String) returns Products;
    };

  @cds.redirection.target
  entity SalesOrders as projection on o2c.SalesOrders {
    *,
    customer.name as customerName,
    customer.country as customerCountry
  } actions {
    action submitOrder() returns SalesOrders;
    action approveOrder() returns SalesOrders;
    action rejectOrder(reason: String) returns SalesOrders;
    action cancelOrder() returns SalesOrders;
    action createInvoice() returns Invoices;
  };

  entity SalesOrderItems as projection on o2c.SalesOrderItems {
    *,
    product.description as productName,
    product.unitPrice as catalogPrice
  };

  entity Invoices as projection on o2c.Invoices {
    *,
    salesOrder.orderNumber as orderNumber
  } actions {
    action recordPayment(amount: Decimal(15,2), method: String, reference: String) returns Invoices;
  };

  entity Payments as projection on o2c.Payments;

  @readonly
  @cds.redirection.target: false
  view OrderAnalytics as select from o2c.SalesOrders as orders {
    key orders.status,
    key orders.orderDate,
    key orders.salesRep,
    count(*) as orderCount : Integer,
    sum(orders.totalAmount) as totalRevenue : Decimal(15,2)
  } group by orders.status, orders.orderDate, orders.salesRep;

  function topCustomers(limit: Integer) returns array of Customers;
  function revenueByMonth(year: Integer) returns array of {
    month: Integer;
    revenue: Decimal(15,2);
    orderCount: Integer;
  };
}

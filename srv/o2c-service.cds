using { o2c } from '../db/schema';

service O2CService @(path: '/api/o2c', requires: 'authenticated-user') {
  entity Customers @(restrict: [
      { grant: 'READ', to: ['SalesRep', 'SalesManager', 'FinanceUser', 'InventoryManager', 'Admin'] },
      { grant: 'blockCustomer', to: 'Admin' }
    ]) as projection on o2c.Customers
    actions {
      action blockCustomer(reason: String) returns Customers;
    };

  @readonly
  entity Products @(restrict: [
      { grant: 'READ', to: ['SalesRep', 'SalesManager', 'FinanceUser', 'InventoryManager', 'Admin'] },
      { grant: 'addStock', to: ['InventoryManager', 'Admin'] }
    ]) as projection on o2c.Products
    actions {
      action addStock(quantity: Integer, reference: String) returns Products;
    };

  @cds.redirection.target
  entity SalesOrders @(restrict: [
      { grant: 'READ', to: ['SalesRep', 'SalesManager', 'FinanceUser', 'Admin'] },
      { grant: 'CREATE', to: ['SalesRep', 'Admin'] },
      { grant: 'submitOrder', to: ['SalesRep', 'Admin'] },
      { grant: ['approveOrder', 'rejectOrder'], to: ['SalesManager', 'Admin'] },
      { grant: 'cancelOrder', to: ['SalesRep', 'SalesManager', 'Admin'] },
      { grant: 'createInvoice', to: ['FinanceUser', 'Admin'] }
    ]) as projection on o2c.SalesOrders {
    *,
    customer.name as customerName,
    customer.country as customerCountry,
    virtual dateRange : String,
    virtual canSubmitOrder : Boolean,
    virtual canApproveOrder : Boolean,
    virtual canRejectOrder : Boolean,
    virtual canCancelOrder : Boolean,
    virtual canCreateInvoice : Boolean
  } actions {
    @Core.OperationAvailable: canSubmitOrder
    action submitOrder() returns SalesOrders;
    @Core.OperationAvailable: canApproveOrder
    action approveOrder() returns SalesOrders;
    @Core.OperationAvailable: canRejectOrder
    action rejectOrder(reason: String) returns SalesOrders;
    @Core.OperationAvailable: canCancelOrder
    action cancelOrder() returns SalesOrders;
    @Core.OperationAvailable: canCreateInvoice
    action createInvoice() returns Invoices;
  };

  entity SalesOrderItems @(restrict: [
      { grant: 'READ', to: ['SalesRep', 'SalesManager', 'FinanceUser', 'Admin'] },
      { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['SalesRep', 'Admin'] }
    ]) as projection on o2c.SalesOrderItems {
    *,
    product.description as productName,
    product.unitPrice as catalogPrice
  };

  entity Invoices @(restrict: [
      { grant: 'READ', to: ['FinanceUser', 'SalesManager', 'Admin'] },
      { grant: 'recordPayment', to: ['FinanceUser', 'Admin'] }
    ]) as projection on o2c.Invoices {
    *,
    salesOrder.orderNumber as orderNumber
  } actions {
    action recordPayment(amount: Decimal(15,2), method: String, reference: String) returns Invoices;
  };

  @readonly
  entity Payments @(restrict: [
      { grant: 'READ', to: ['FinanceUser', 'Admin'] }
    ]) as projection on o2c.Payments;

  @readonly
  @cds.persistence.skip
  entity SalesOrderStatuses @(restrict: [
    { grant: 'READ', to: ['SalesRep', 'SalesManager', 'FinanceUser', 'Admin'] }
  ]) {
    key code : String(20);
    name     : String(40);
  };

  @readonly
  @cds.persistence.skip
  entity SalesOrderDateRanges @(restrict: [
    { grant: 'READ', to: ['SalesRep', 'SalesManager', 'FinanceUser', 'Admin'] }
  ]) {
    key code : String(20);
    name     : String(40);
  };

  @readonly
  @cds.redirection.target: false
  @(restrict: [
    { grant: 'READ', to: ['SalesManager', 'FinanceUser', 'Admin'] }
  ])
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

  function currentUser() returns {
    id: String;
    canViewSalesOrders: Boolean;
    canCreateOrder: Boolean;
    canSubmitOrder: Boolean;
    canApproveOrder: Boolean;
    canRejectOrder: Boolean;
    canCancelOrder: Boolean;
    canCreateInvoice: Boolean;
    canReadFinance: Boolean;
    canRecordPayment: Boolean;
    canAddStock: Boolean;
    canViewAnalytics: Boolean;
    isAdmin: Boolean;
  };
}

using O2CService from './o2c-service';

annotate O2CService.SalesOrders with @(
  UI.HeaderInfo: {
    TypeName: 'Sales Order',
    TypeNamePlural: 'Sales Orders',
    Title: { Value: orderNumber },
    Description: { Value: customerName }
  },
  UI.SelectionFields: [
    status,
    orderDate,
    customer_ID,
    salesRep
  ],
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: orderNumber, Label: 'Order #' },
    { $Type: 'UI.DataField', Value: customerName, Label: 'Customer' },
    { $Type: 'UI.DataField', Value: orderDate, Label: 'Order Date' },
    { $Type: 'UI.DataField', Value: deliveryDate, Label: 'Delivery Date' },
    {
      $Type: 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Status',
      Label: 'Status'
    },
    { $Type: 'UI.DataField', Value: totalAmount, Label: 'Total' },
    { $Type: 'UI.DataField', Value: currency, Label: 'Currency' },
    { $Type: 'UI.DataField', Value: salesRep, Label: 'Sales Rep' },
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'O2CService.submitOrder',
      Label: 'Submit'
    },
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'O2CService.approveOrder',
      Label: 'Approve'
    }
  ],
  UI.DataPoint #Status: {
    Value: status,
    Title: 'Status'
  },
  UI.Identification: [
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'O2CService.submitOrder',
      Label: 'Submit'
    },
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'O2CService.approveOrder',
      Label: 'Approve'
    },
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'O2CService.rejectOrder',
      Label: 'Reject'
    },
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'O2CService.cancelOrder',
      Label: 'Cancel'
    },
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'O2CService.createInvoice',
      Label: 'Create Invoice'
    }
  ],
  UI.FieldGroup #General: {
    Data: [
      { $Type: 'UI.DataField', Value: orderNumber, Label: 'Order #' },
      { $Type: 'UI.DataField', Value: customerName, Label: 'Customer' },
      { $Type: 'UI.DataField', Value: orderDate, Label: 'Order Date' },
      { $Type: 'UI.DataField', Value: deliveryDate, Label: 'Delivery Date' },
      { $Type: 'UI.DataField', Value: status, Label: 'Status' },
      { $Type: 'UI.DataField', Value: totalAmount, Label: 'Total Amount' },
      { $Type: 'UI.DataField', Value: notes, Label: 'Notes' }
    ]
  },
  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'General',
      Target: '@UI.FieldGroup#General'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Items',
      Target: 'items/@UI.LineItem'
    }
  ]
);

annotate O2CService.SalesOrderItems with @(
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: lineNumber, Label: 'Line' },
    { $Type: 'UI.DataField', Value: productName, Label: 'Product' },
    { $Type: 'UI.DataField', Value: quantity, Label: 'Quantity' },
    { $Type: 'UI.DataField', Value: unitPrice, Label: 'Unit Price' },
    { $Type: 'UI.DataField', Value: discount, Label: 'Discount %' },
    { $Type: 'UI.DataField', Value: lineTotal, Label: 'Line Total' }
  ]
);

annotate O2CService.Customers with @(
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: customerNumber, Label: 'Customer #' },
    { $Type: 'UI.DataField', Value: name, Label: 'Name' },
    { $Type: 'UI.DataField', Value: email, Label: 'Email' },
    { $Type: 'UI.DataField', Value: country, Label: 'Country' },
    { $Type: 'UI.DataField', Value: creditLimit, Label: 'Credit Limit' },
    { $Type: 'UI.DataField', Value: blocked, Label: 'Blocked' }
  ]
);

annotate O2CService.Products with @(
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: productCode, Label: 'Product #' },
    { $Type: 'UI.DataField', Value: description, Label: 'Description' },
    { $Type: 'UI.DataField', Value: unitPrice, Label: 'Unit Price' },
    { $Type: 'UI.DataField', Value: stockQuantity, Label: 'Stock' },
    { $Type: 'UI.DataField', Value: category, Label: 'Category' }
  ]
);

annotate O2CService.Invoices with @(
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: invoiceNumber, Label: 'Invoice #' },
    { $Type: 'UI.DataField', Value: orderNumber, Label: 'Order #' },
    { $Type: 'UI.DataField', Value: invoiceDate, Label: 'Invoice Date' },
    { $Type: 'UI.DataField', Value: dueDate, Label: 'Due Date' },
    { $Type: 'UI.DataField', Value: status, Label: 'Status' },
    { $Type: 'UI.DataField', Value: totalAmount, Label: 'Total' }
  ]
);

annotate O2CService.SalesOrders:customer with @(
  Common.ValueList: {
    CollectionPath: 'Customers',
    Parameters: [
      { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: customer_ID, ValueListProperty: 'ID' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'customerNumber' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'country' }
    ]
  }
);

annotate O2CService.SalesOrderItems:product with @(
  Common.ValueList: {
    CollectionPath: 'Products',
    Parameters: [
      { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: product_ID, ValueListProperty: 'ID' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'productCode' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'description' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'unitPrice' }
    ]
  }
);

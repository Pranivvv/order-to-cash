using O2CService from './o2c-service';

annotate O2CService.OrderAnalytics with @(
  UI.Chart #revenueByMonth: {
    ChartType: #Bar,
    Title: 'Revenue by Month',
    Measures: [totalRevenue],
    Dimensions: [orderDate],
    MeasureAttributes: [{
      Measure: totalRevenue,
      Role: #Axis1,
      DataPoint: '@UI.DataPoint#Revenue'
    }],
    DimensionAttributes: [{
      Dimension: orderDate,
      Role: #Category
    }]
  },
  UI.DataPoint #Revenue: {
    Value: totalRevenue,
    Title: 'Revenue'
  },
  UI.PresentationVariant #revenueByMonth: {
    SortOrder: [{ Property: orderDate, Descending: false }],
    Visualizations: ['@UI.Chart#revenueByMonth', '@UI.LineItem']
  },
  UI.Chart #ordersByStatus: {
    ChartType: #Donut,
    Title: 'Orders by Status',
    Measures: [orderCount],
    Dimensions: [status],
    MeasureAttributes: [{
      Measure: orderCount,
      Role: #Axis1
    }],
    DimensionAttributes: [{
      Dimension: status,
      Role: #Category
    }]
  },
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: status, Label: 'Status' },
    { $Type: 'UI.DataField', Value: orderDate, Label: 'Order Date' },
    { $Type: 'UI.DataField', Value: salesRep, Label: 'Sales Rep' },
    { $Type: 'UI.DataField', Value: orderCount, Label: 'Orders' },
    { $Type: 'UI.DataField', Value: totalRevenue, Label: 'Revenue' }
  ]
);

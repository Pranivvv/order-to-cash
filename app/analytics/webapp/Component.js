sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("o2c.analytics.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      this.setModel(new JSONModel({
        totalRevenue: 0,
        totalRevenueDisplay: "0",
        openOrders: 0,
        invoicedOrders: 0,
        paidOrders: 0,
        monthlyRevenue: [],
        statusData: [],
        recentOrders: [],
        topCustomers: [],
        loading: false,
        error: ""
      }), "analytics");

      this.getRouter().initialize();
    }
  });
});

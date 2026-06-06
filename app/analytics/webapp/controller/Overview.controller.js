sap.ui.define([
  "o2c/analytics/controller/BaseController"
], function (BaseController) {
  "use strict";

  return BaseController.extend("o2c.analytics.controller.Overview", {
    onInit: function () {
      this.loadAnalyticsData();
    },

    onRefresh: function () {
      this.loadAnalyticsData();
    },

    onShowAnalytics: function () {
      this.getRouter().navTo("Analytics");
    }
  });
});

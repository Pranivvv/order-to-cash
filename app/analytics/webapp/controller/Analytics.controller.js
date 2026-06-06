sap.ui.define([
  "o2c/analytics/controller/BaseController"
], function (BaseController) {
  "use strict";

  return BaseController.extend("o2c.analytics.controller.Analytics", {
    onInit: function () {
      this.loadAnalyticsData().then(this.connectPopovers.bind(this));
    },

    onRefresh: function () {
      this.loadAnalyticsData().then(this.connectPopovers.bind(this));
    },

    connectPopovers: function () {
      const revenuePopover = this.byId("revenuePopover");
      const revenueChart = this.byId("revenueChart");
      const statusPopover = this.byId("statusPopover");
      const statusChart = this.byId("statusChart");

      if (revenuePopover && revenueChart) {
        revenuePopover.connect(revenueChart.getVizUid());
      }

      if (statusPopover && statusChart) {
        statusPopover.connect(statusChart.getVizUid());
      }
    },

    onNavBack: function () {
      this.getRouter().navTo("Overview");
    }
  });
});

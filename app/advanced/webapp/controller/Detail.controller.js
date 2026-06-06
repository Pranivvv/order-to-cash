sap.ui.define([
  "o2c/advanced/controller/BaseController"
], function (BaseController) {
  "use strict";

  return BaseController.extend("o2c.advanced.controller.Detail", {
    onInit: function () {
      this.getRouter().getRoute("Detail").attachPatternMatched(this.onMatched, this);
    },

    onMatched: async function (event) {
      const orderId = event.getParameter("arguments").orderId;
      const model = this.getViewModel();
      const current = model.getProperty("/selectedOrder");

      if (current && current.ID === orderId) return;

      try {
        const order = await this.fetchJson(`/api/o2c/SalesOrders(${encodeURIComponent(`'${orderId}'`)})`);
        model.setProperty("/selectedOrder", order);
      } catch (error) {
        model.setProperty("/error", error.message);
      }
    },

    onNavBack: function () {
      this.getRouter().navTo("Main");
    }
  });
});

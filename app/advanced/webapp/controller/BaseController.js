sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("o2c.advanced.controller.BaseController", {
    getRouter: function () {
      return this.getOwnerComponent().getRouter();
    },

    getViewModel: function () {
      return this.getOwnerComponent().getModel("view");
    },

    loadOrders: async function () {
      const model = this.getViewModel();
      model.setProperty("/busy", true);
      model.setProperty("/error", "");

      try {
        const [orders, customers, products] = await Promise.all([
          this.fetchJson("/api/o2c/SalesOrders?$orderby=orderDate desc"),
          this.fetchJson("/api/o2c/Customers?$orderby=name"),
          this.fetchJson("/api/o2c/Products?$orderby=productCode")
        ]);
        model.setProperty("/orders", orders.value || []);
        model.setProperty("/customers", customers.value || []);
        model.setProperty("/products", products.value || []);
      } catch (error) {
        model.setProperty("/error", error.message || "Unable to load O2C data");
      } finally {
        model.setProperty("/busy", false);
      }
    },

    fetchJson: async function (url, options) {
      const response = await fetch(url, Object.assign({
        headers: {
          "accept": "application/json",
          "content-type": "application/json"
        }
      }, options || {}));

      if (!response.ok) {
        throw new Error(`${url} returned HTTP ${response.status}`);
      }

      return response.status === 204 ? {} : response.json();
    },

    toast: function (message) {
      MessageToast.show(message);
    }
  });
});

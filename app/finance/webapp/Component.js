sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("o2c.finance.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      this.setModel(new JSONModel({
        invoices: [],
        payments: [],
        selectedInvoice: null,
        busy: false,
        error: ""
      }), "finance");

      this.getRouter().initialize();
    }
  });
});

sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("o2c.advanced.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      this.setModel(new JSONModel({
        orders: [],
        customers: [],
        selectedOrder: null,
        statusFilters: [],
        busy: false,
        error: ""
      }), "view");

      this.getRouter().initialize();
    }
  });
});

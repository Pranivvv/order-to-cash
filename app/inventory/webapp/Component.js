sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("o2c.inventory.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      this.setModel(new JSONModel({
        products: [],
        summary: {
          productCount: 0,
          totalStock: 0,
          lowStockCount: 0
        },
        busy: false,
        error: ""
      }), "inventory");

      this.getRouter().initialize();
    }
  });
});

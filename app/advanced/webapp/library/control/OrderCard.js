sap.ui.define([
  "sap/m/VBox",
  "sap/m/ObjectHeader",
  "sap/m/ObjectStatus"
], function (VBox, ObjectHeader, ObjectStatus) {
  "use strict";

  return VBox.extend("o2c.lib.control.OrderCard", {
    metadata: {
      properties: {
        orderNumber: { type: "string", defaultValue: "" },
        customerName: { type: "string", defaultValue: "" },
        status: { type: "string", defaultValue: "Draft" }
      }
    },

    init: function () {
      this.header = new ObjectHeader({
        title: "{/orderNumber}",
        intro: "{/customerName}",
        statuses: [
          new ObjectStatus({ text: "{/status}" })
        ]
      });
      this.addItem(this.header);
    }
  });
});

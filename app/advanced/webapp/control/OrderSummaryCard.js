sap.ui.define([
  "sap/ui/core/XMLComposite"
], function (XMLComposite) {
  "use strict";

  return XMLComposite.extend("o2c.advanced.control.OrderSummaryCard", {
    metadata: {
      compositeMetadata: {
        xmlFragment: "o2c.advanced.control.OrderSummaryCard"
      },
      properties: {
        orderNumber: { type: "string", defaultValue: "" },
        customerName: { type: "string", defaultValue: "" },
        totalAmount: { type: "float", defaultValue: 0 },
        currency: { type: "string", defaultValue: "USD" },
        status: { type: "string", defaultValue: "Draft" },
        orderDate: { type: "string", defaultValue: "" },
        salesRep: { type: "string", defaultValue: "" }
      },
      events: {
        press: {}
      }
    }
  });
});

sap.ui.define([
  "sap/ui/core/library"
], function () {
  "use strict";

  sap.ui.getCore().initLibrary({
    name: "o2c.lib",
    version: "1.0.0",
    dependencies: ["sap.ui.core", "sap.m"],
    types: ["o2c.lib.OrderStatus"],
    controls: ["o2c.lib.control.OrderCard"],
    noLibraryCSS: true
  });

  o2c.lib.OrderStatus = {
    Draft: "Draft",
    Submitted: "Submitted",
    Approved: "Approved",
    Rejected: "Rejected",
    InDelivery: "InDelivery",
    Invoiced: "Invoiced",
    Paid: "Paid",
    Cancelled: "Cancelled"
  };

  return o2c.lib;
});

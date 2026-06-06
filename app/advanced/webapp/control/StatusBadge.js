sap.ui.define([
  "sap/ui/core/Control"
], function (Control) {
  "use strict";

  const StatusBadge = Control.extend("o2c.advanced.control.StatusBadge", {
    metadata: {
      properties: {
        status: { type: "string", defaultValue: "Draft" },
        showIcon: { type: "boolean", defaultValue: true }
      },
      events: {
        press: {
          parameters: {
            status: { type: "string" }
          }
        }
      }
    },

    renderer: {
      apiVersion: 2,
      render: function (rm, control) {
        const status = control.getStatus();
        const config = StatusBadge.statusConfig[status] || StatusBadge.statusConfig.Draft;

        rm.openStart("button", control);
        rm.class("o2cStatusBadge");
        rm.class(`o2cStatusBadge--${config.cssClass}`);
        rm.attr("type", "button");
        rm.attr("aria-label", `Status: ${status}`);
        rm.openEnd();

        if (control.getShowIcon()) {
          rm.openStart("span");
          rm.class("o2cStatusBadge__icon");
          rm.openEnd();
          rm.text(config.icon);
          rm.close("span");
        }

        rm.openStart("span");
        rm.class("o2cStatusBadge__text");
        rm.openEnd();
        rm.text(status);
        rm.close("span");
        rm.close("button");
      }
    },

    ontap: function () {
      this.firePress({ status: this.getStatus() });
    },

    onclick: function () {
      this.firePress({ status: this.getStatus() });
    }
  });

  StatusBadge.statusConfig = {
    Draft: { cssClass: "draft", icon: "-" },
    Submitted: { cssClass: "submitted", icon: ">" },
    Approved: { cssClass: "approved", icon: "+" },
    Rejected: { cssClass: "rejected", icon: "!" },
    InDelivery: { cssClass: "delivery", icon: ">" },
    Invoiced: { cssClass: "invoiced", icon: "#" },
    Paid: { cssClass: "paid", icon: "$" },
    Cancelled: { cssClass: "cancelled", icon: "x" }
  };

  return StatusBadge;
});

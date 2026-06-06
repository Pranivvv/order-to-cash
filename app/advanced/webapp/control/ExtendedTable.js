sap.ui.define([
  "sap/m/Table",
  "sap/m/Toolbar",
  "sap/m/ToolbarSpacer",
  "sap/m/Button",
  "sap/m/Title",
  "sap/m/TableRenderer"
], function (Table, Toolbar, ToolbarSpacer, Button, Title, TableRenderer) {
  "use strict";

  return Table.extend("o2c.advanced.control.ExtendedTable", {
    metadata: {
      properties: {
        exportEnabled: { type: "boolean", defaultValue: true },
        refreshEnabled: { type: "boolean", defaultValue: true },
        totalCount: { type: "int", defaultValue: 0 }
      },
      events: {
        exportPress: {},
        refreshPress: {}
      }
    },

    renderer: TableRenderer,

    init: function () {
      Table.prototype.init.apply(this, arguments);
      this.buildExtendedToolbar();
    },

    buildExtendedToolbar: function () {
      this.exportButton = new Button({
        icon: "sap-icon://excel-attachment",
        tooltip: "Export to CSV",
        visible: this.getExportEnabled(),
        press: this.fireExportPress.bind(this)
      });

      this.refreshButton = new Button({
        icon: "sap-icon://refresh",
        tooltip: "Refresh",
        visible: this.getRefreshEnabled(),
        press: this.fireRefreshPress.bind(this)
      });

      this.setHeaderToolbar(new Toolbar({
        content: [
          new Title({ text: "Sales Orders" }),
          new ToolbarSpacer(),
          this.exportButton,
          this.refreshButton
        ]
      }));
    },

    setExportEnabled: function (enabled) {
      this.setProperty("exportEnabled", enabled, true);
      this.exportButton?.setVisible(enabled);
      return this;
    },

    setRefreshEnabled: function (enabled) {
      this.setProperty("refreshEnabled", enabled, true);
      this.refreshButton?.setVisible(enabled);
      return this;
    }
  });
});

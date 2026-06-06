sap.ui.define([
  "o2c/advanced/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "sap/m/MessageToast"
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter, MessageToast) {
  "use strict";

  return BaseController.extend("o2c.advanced.controller.Main", {
    onInit: function () {
      this.loadOrders();
    },

    onRefresh: function () {
      this.loadOrders();
    },

    onOpenCreateDialog: async function () {
      if (!this._createDialog) {
        this._createDialog = await this.loadFragment({
          name: "o2c.advanced.fragment.CreateOrder"
        });
        this._createDialog.setModel(new JSONModel(this.createDialogDefaults()), "dialog");
      }

      this._createDialog.getModel("dialog").setData(this.createDialogDefaults());
      this._createDialog.open();
    },

    createDialogDefaults: function () {
      const customers = this.getViewModel().getProperty("/customers") || [];
      return {
        customerId: customers[0]?.ID || "",
        deliveryDate: "",
        notes: "",
        currency: "USD"
      };
    },

    onCreateOrderConfirm: async function () {
      const data = this._createDialog.getModel("dialog").getData();

      if (!data.customerId) {
        MessageToast.show("Select a customer first");
        return;
      }

      try {
        await this.fetchJson("/api/o2c/SalesOrders", {
          method: "POST",
          body: JSON.stringify({
            customer_ID: data.customerId,
            deliveryDate: data.deliveryDate || null,
            notes: data.notes,
            currency: data.currency
          })
        });
        this._createDialog.close();
        MessageToast.show("Sales order created");
        this.loadOrders();
      } catch (error) {
        MessageToast.show(error.message);
      }
    },

    onCreateOrderCancel: function () {
      this._createDialog.close();
    },

    onOpenFilter: async function () {
      if (!this._filterDialog) {
        this._filterDialog = await this.loadFragment({
          name: "o2c.advanced.fragment.StatusFilter"
        });
      }
      this._filterDialog.open();
    },

    onFilterConfirm: function (event) {
      const table = this.byId("ordersTable");
      const binding = table.getBinding("items");
      const params = event.getParameters();
      const filters = [];

      params.filterItems.forEach(function (item) {
        filters.push(new Filter("status", FilterOperator.EQ, item.getKey()));
      });

      const sortItem = params.sortItem;
      const sorters = sortItem ? [new Sorter(sortItem.getKey(), params.sortDescending)] : [];

      binding.filter(filters.length ? [new Filter({ filters: filters, and: false })] : []);
      binding.sort(sorters);
    },

    onFilterReset: function () {
      const binding = this.byId("ordersTable").getBinding("items");
      binding.filter([]);
      binding.sort([]);
    },

    onOrderPress: function (event) {
      const context = event.getSource().getBindingContext("view");
      const order = context && context.getObject();
      if (!order) return;

      this.getViewModel().setProperty("/selectedOrder", order);
      this.getRouter().navTo("Detail", { orderId: order.ID });
    },

    onStatusPress: function (event) {
      MessageToast.show(`Status: ${event.getParameter("status")}`);
    },

    onExport: function () {
      const orders = this.getViewModel().getProperty("/orders") || [];
      const rows = orders.map(function (order) {
        return [
          order.orderNumber,
          order.customerName,
          order.orderDate,
          order.totalAmount,
          order.currency,
          order.status
        ].join(",");
      });

      const csv = ["Order,Customer,Date,Total,Currency,Status"].concat(rows).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sales-orders.csv";
      link.click();
      URL.revokeObjectURL(url);
    }
  });
});

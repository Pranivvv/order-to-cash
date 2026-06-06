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
      const products = this.getViewModel().getProperty("/products") || [];
      const product = products[0] || {};

      return {
        customerId: customers[0]?.ID || "",
        productId: product.ID || "",
        quantity: 1,
        discount: 0,
        unitPrice: Number(product.unitPrice || 0),
        availableStock: Number(product.stockQuantity || 0),
        lineTotal: Number(product.unitPrice || 0),
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

      if (!data.productId) {
        MessageToast.show("Select a product first");
        return;
      }

      if (!Number(data.quantity) || Number(data.quantity) <= 0) {
        MessageToast.show("Enter a quantity greater than zero");
        return;
      }

      if (Number(data.quantity) > Number(data.availableStock)) {
        MessageToast.show("Quantity exceeds available stock");
        return;
      }

      if (Number(data.discount || 0) < 0 || Number(data.discount || 0) > 100) {
        MessageToast.show("Discount must be between 0 and 100");
        return;
      }

      try {
        const created = await this.fetchJson("/api/o2c/SalesOrders", {
          method: "POST",
          body: JSON.stringify({
            customer_ID: data.customerId,
            deliveryDate: data.deliveryDate || null,
            notes: data.notes,
            currency: data.currency
          })
        });

        if (data.productId && Number(data.quantity) > 0) {
          await this.fetchJson("/api/o2c/SalesOrderItems", {
            method: "POST",
            body: JSON.stringify({
              order_ID: created.ID,
              product_ID: data.productId,
              quantity: Number(data.quantity),
              discount: Number(data.discount || 0)
            })
          });
        }

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

    onProductChange: function () {
      const dialogModel = this._createDialog.getModel("dialog");
      const product = this.findSelectedProduct(dialogModel.getProperty("/productId"));

      dialogModel.setProperty("/unitPrice", Number(product?.unitPrice || 0));
      dialogModel.setProperty("/availableStock", Number(product?.stockQuantity || 0));
      this.updateLineTotal();
    },

    onOrderItemInputChange: function (event) {
      const source = event.getSource();
      const binding = source.getBinding("value");

      if (binding) {
        this._createDialog.getModel("dialog").setProperty(binding.getPath(), source.getValue());
      }

      this.updateLineTotal();
    },

    findSelectedProduct: function (productId) {
      const products = this.getViewModel().getProperty("/products") || [];
      return products.find(function (product) {
        return product.ID === productId;
      });
    },

    updateLineTotal: function () {
      const dialogModel = this._createDialog.getModel("dialog");
      const quantity = Number(dialogModel.getProperty("/quantity") || 0);
      const unitPrice = Number(dialogModel.getProperty("/unitPrice") || 0);
      const discount = Number(dialogModel.getProperty("/discount") || 0);
      const lineTotal = quantity * unitPrice * (1 - discount / 100);

      dialogModel.setProperty("/lineTotal", Number(lineTotal.toFixed(2)));
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

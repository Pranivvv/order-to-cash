sap.ui.define([
  "o2c/advanced/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
  "use strict";

  const currencyRates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.78,
    INR: 83
  };

  return BaseController.extend("o2c.advanced.controller.Main", {
    onInit: function () {
      this.loadOrders();
    },

    onRefresh: function () {
      this.loadOrders();
    },

    onSearchOrders: function (event) {
      this.getViewModel().setProperty("/filters/query", event.getParameter("query") || event.getParameter("newValue") || "");
      this.applyOrderFilters();
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
        baseUnitPrice: Number(product.unitPrice || 0),
        baseCurrency: product.currency || "USD",
        unitPrice: this.convertPrice(Number(product.unitPrice || 0), product.currency || "USD", "USD"),
        availableStock: Number(product.stockQuantity || 0),
        lineTotal: this.convertPrice(Number(product.unitPrice || 0), product.currency || "USD", "USD"),
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
              unitPrice: Number(data.unitPrice || 0),
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

      dialogModel.setProperty("/baseUnitPrice", Number(product?.unitPrice || 0));
      dialogModel.setProperty("/baseCurrency", product?.currency || "USD");
      dialogModel.setProperty("/unitPrice", this.convertPrice(
        Number(product?.unitPrice || 0),
        product?.currency || "USD",
        dialogModel.getProperty("/currency") || "USD"
      ));
      dialogModel.setProperty("/availableStock", Number(product?.stockQuantity || 0));
      this.updateLineTotal();
    },

    onCurrencyChange: function () {
      const dialogModel = this._createDialog.getModel("dialog");
      dialogModel.setProperty("/unitPrice", this.convertPrice(
        Number(dialogModel.getProperty("/baseUnitPrice") || 0),
        dialogModel.getProperty("/baseCurrency") || "USD",
        dialogModel.getProperty("/currency") || "USD"
      ));
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

    convertPrice: function (amount, fromCurrency, toCurrency) {
      const fromRate = currencyRates[fromCurrency] || currencyRates.USD;
      const toRate = currencyRates[toCurrency] || currencyRates.USD;

      return Number((Number(amount || 0) / fromRate * toRate).toFixed(2));
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
      const params = event.getParameters();
      const sortItem = params.sortItem;
      const statusKeys = [
        "Draft",
        "Submitted",
        "Approved",
        "Rejected",
        "InDelivery",
        "Invoiced",
        "Paid",
        "Cancelled"
      ];
      const filters = {
        statuses: [],
        dateRange: ""
      };

      (params.filterItems || []).forEach(function (item) {
        const key = item.getKey();
        if (statusKeys.includes(key)) {
          filters.statuses.push(key);
        } else {
          filters.dateRange = key;
        }
      });

      this.getViewModel().setProperty("/filters/statuses", filters.statuses);
      this.getViewModel().setProperty("/filters/dateRange", filters.dateRange);
      this.getViewModel().setProperty("/filters/sortKey", sortItem ? sortItem.getKey() : "orderDate");
      this.getViewModel().setProperty("/filters/sortDescending", params.sortDescending === undefined ? true : !!params.sortDescending);
      this.applyOrderFilters();
    },

    onFilterReset: function () {
      this.getViewModel().setProperty("/filters", {
        query: this.getViewModel().getProperty("/filters/query") || "",
        statuses: [],
        dateRange: "",
        sortKey: "orderDate",
        sortDescending: true
      });
      this.applyOrderFilters();
    },

    applyOrderFilters: function () {
      const model = this.getViewModel();
      const filters = model.getProperty("/filters") || {};
      const query = String(filters.query || "").trim().toLowerCase();
      const statuses = filters.statuses || [];
      const dateRange = filters.dateRange || "";
      const sortKey = filters.sortKey || "orderDate";
      const sortDescending = filters.sortDescending !== false;
      let orders = (model.getProperty("/allOrders") || []).slice();

      if (query) {
        orders = orders.filter(function (order) {
          return [
            order.orderNumber,
            order.customerName,
            order.salesRep,
            order.status,
            order.currency
          ].some(function (value) {
            return String(value || "").toLowerCase().includes(query);
          });
        });
      }

      if (statuses.length) {
        orders = orders.filter(function (order) {
          return statuses.includes(order.status);
        });
      }

      if (dateRange) {
        orders = orders.filter(function (order) {
          return this.isOrderInDateRange(order.orderDate, dateRange);
        }.bind(this));
      }

      orders.sort(function (left, right) {
        const leftValue = left[sortKey];
        const rightValue = right[sortKey];
        const direction = sortDescending ? -1 : 1;

        if (sortKey === "totalAmount") {
          return (Number(leftValue || 0) - Number(rightValue || 0)) * direction;
        }

        return String(leftValue || "").localeCompare(String(rightValue || "")) * direction;
      });

      model.setProperty("/orders", orders);
    },

    isOrderInDateRange: function (orderDate, dateRange) {
      const date = this.parseLocalDate(orderDate);
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      if (!date) {
        return false;
      }

      switch (dateRange) {
        case "today":
          return date.getTime() === startOfToday.getTime();
        case "last7":
          return date >= this.addDays(startOfToday, -6) && date <= startOfToday;
        case "last30":
          return date >= this.addDays(startOfToday, -29) && date <= startOfToday;
        case "thisMonth":
          return date >= new Date(today.getFullYear(), today.getMonth(), 1) && date <= startOfToday;
        case "thisYear":
          return date >= new Date(today.getFullYear(), 0, 1) && date <= startOfToday;
        default:
          return true;
      }
    },

    parseLocalDate: function (value) {
      if (!value) {
        return null;
      }

      const parts = String(value).slice(0, 10).split("-").map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) {
        return null;
      }

      return new Date(parts[0], parts[1] - 1, parts[2]);
    },

    addDays: function (date, days) {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
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

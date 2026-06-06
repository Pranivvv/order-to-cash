sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
  "use strict";

  return Controller.extend("o2c.inventory.controller.Products", {
    onInit: function () {
      this.loadProducts();
    },

    onRefresh: function () {
      this.loadProducts();
    },

    loadProducts: async function () {
      const model = this.getOwnerComponent().getModel("inventory");
      model.setProperty("/busy", true);
      model.setProperty("/error", "");

      try {
        const data = await this.fetchJson("/api/o2c/Products?$orderby=productCode");
        const products = data.value || [];

        model.setProperty("/products", products);
        model.setProperty("/summary", {
          productCount: products.length,
          totalStock: products.reduce(function (sum, product) {
            return sum + Number(product.stockQuantity || 0);
          }, 0),
          lowStockCount: products.filter(function (product) {
            return Number(product.stockQuantity || 0) <= 10;
          }).length
        });
      } catch (error) {
        model.setProperty("/error", error.message || "Unable to load inventory");
        MessageToast.show("Unable to load inventory");
      } finally {
        model.setProperty("/busy", false);
      }
    },

    onSearch: function (event) {
      const query = event.getParameter("query") || event.getParameter("newValue") || "";
      const binding = this.byId("productsTable").getBinding("items");

      if (!query) {
        binding.filter([]);
        return;
      }

      binding.filter([
        new Filter({
          filters: [
            new Filter("productCode", FilterOperator.Contains, query),
            new Filter("description", FilterOperator.Contains, query),
            new Filter("category", FilterOperator.Contains, query)
          ],
          and: false
        })
      ]);
    },

    onOpenAddStockDialog: async function (event) {
      const product = event.getSource().getBindingContext("inventory").getObject();

      if (!this._addStockDialog) {
        this._addStockDialog = await this.loadFragment({
          name: "o2c.inventory.fragment.AddStock"
        });
        this._addStockDialog.setModel(new JSONModel({}), "stock");
      }

      this._addStockDialog.getModel("stock").setData({
        productId: product.ID,
        productCode: product.productCode,
        description: product.description,
        currentStock: Number(product.stockQuantity || 0),
        quantity: 1,
        reference: ""
      });
      this._addStockDialog.open();
    },

    onAddStockConfirm: async function () {
      const data = this._addStockDialog.getModel("stock").getData();
      const quantity = Number(data.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        MessageToast.show("Enter a positive whole number");
        return;
      }

      try {
        await this.fetchJson(`/api/o2c/Products(${data.productId})/O2CService.addStock`, {
          method: "POST",
          body: JSON.stringify({
            quantity,
            reference: data.reference
          })
        });
        this._addStockDialog.close();
        MessageToast.show("Stock added");
        this.loadProducts();
      } catch (error) {
        MessageToast.show(error.message);
      }
    },

    onAddStockCancel: function () {
      this._addStockDialog.close();
    },

    fetchJson: async function (url, options) {
      const response = await fetch(url, Object.assign({
        headers: {
          "accept": "application/json",
          "content-type": "application/json"
        }
      }, options || {}));

      if (!response.ok) {
        throw new Error(`${url} returned HTTP ${response.status}`);
      }

      return response.json();
    }
  });
});

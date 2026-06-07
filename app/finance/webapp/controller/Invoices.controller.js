sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("o2c.finance.controller.Invoices", {
    onInit: function () {
      this.loadInvoices();
    },

    onRefresh: function () {
      this.loadInvoices();
    },

    loadInvoices: async function () {
      const model = this.getFinanceModel();
      model.setProperty("/busy", true);
      model.setProperty("/error", "");

      try {
        const user = await this.fetchJson("/api/o2c/currentUser()");
        model.setProperty("/user", user);

        if (!user.canReadFinance) {
          model.setProperty("/invoices", []);
          model.setProperty("/payments", []);
          model.setProperty("/selectedInvoice", null);
          model.setProperty("/error", `Logged in as ${user.id}. FinanceUser or Admin role is required to view invoices.`);
          return;
        }

        const data = await this.fetchJson("/api/o2c/Invoices?$orderby=invoiceDate desc");
        const invoices = await this.withPaymentTotals(data.value || []);
        model.setProperty("/invoices", invoices);

        const selected = model.getProperty("/selectedInvoice");
        const nextSelected = selected
          ? invoices.find((invoice) => invoice.ID === selected.ID)
          : invoices[0];

        model.setProperty("/selectedInvoice", nextSelected || null);
        await this.loadPayments(nextSelected?.ID);
      } catch (error) {
        model.setProperty("/error", error.message || "Unable to load invoices");
      } finally {
        model.setProperty("/busy", false);
      }
    },

    withPaymentTotals: async function (invoices) {
      return Promise.all(invoices.map(async (invoice) => {
        const payments = await this.getPayments(invoice.ID);
        const paidTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        const totalAmount = Number(invoice.totalAmount || 0);

        return Object.assign({}, invoice, {
          paidTotal,
          openAmount: Math.max(totalAmount - paidTotal, 0)
        });
      }));
    },

    getPayments: async function (invoiceId) {
      const quotedId = this.odataKey(invoiceId);
      const data = await this.fetchJson(`/api/o2c/Payments?$filter=invoice_ID eq ${quotedId}&$orderby=paymentDate desc`);
      return data.value || [];
    },

    loadPayments: async function (invoiceId) {
      const model = this.getFinanceModel();
      if (!invoiceId) {
        model.setProperty("/payments", []);
        return;
      }

      model.setProperty("/payments", await this.getPayments(invoiceId));
    },

    onInvoicePress: function (event) {
      const item = event.getParameter("listItem") || event.getSource();
      this.selectInvoiceFromItem(item);
    },

    onInvoiceSelectionChange: function (event) {
      this.selectInvoiceFromItem(event.getParameter("listItem"));
    },

    selectInvoiceFromItem: function (item) {
      const context = item && item.getBindingContext("finance");
      const invoice = context && context.getObject();
      if (!invoice) return;

      this.getFinanceModel().setProperty("/selectedInvoice", invoice);
      this.loadPayments(invoice.ID);
    },

    onOpenPaymentDialog: async function () {
      const invoice = this.getFinanceModel().getProperty("/selectedInvoice");
      const user = this.getFinanceModel().getProperty("/user") || {};

      if (!user.canRecordPayment) {
        MessageToast.show("You are not allowed to record payments");
        return;
      }

      if (!invoice) {
        MessageToast.show("Select an invoice first");
        return;
      }

      if (invoice.status === "Paid") {
        MessageToast.show("Invoice is already paid");
        return;
      }

      if (!this.paymentDialog) {
        this.paymentDialog = await this.loadFragment({
          name: "o2c.finance.fragment.RecordPayment"
        });
      }

      this.paymentDialog.setModel(new JSONModel({
        ID: invoice.ID,
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: invoice.orderNumber,
        amount: Number(invoice.openAmount || invoice.totalAmount || 0),
        openAmount: Number(invoice.openAmount || invoice.totalAmount || 0),
        currency: invoice.currency || "USD",
        method: "Wire",
        reference: `PAY-${Date.now()}`
      }), "payment");
      this.paymentDialog.open();
    },

    onRecordPaymentConfirm: async function () {
      const payment = this.paymentDialog.getModel("payment").getData();
      const amount = Number(payment.amount);

      if (!amount || amount <= 0) {
        MessageToast.show("Enter a payment amount greater than zero");
        return;
      }

      try {
        await this.fetchJson(`/api/o2c/Invoices(${this.odataUuidKey(payment.ID)})/O2CService.recordPayment`, {
          method: "POST",
          body: JSON.stringify({
            amount,
            method: payment.method,
            reference: payment.reference
          })
        });
        this.paymentDialog.close();
        MessageToast.show("Payment recorded");
        await this.loadInvoices();
      } catch (error) {
        MessageToast.show(error.message);
      }
    },

    onRecordPaymentCancel: function () {
      this.paymentDialog.close();
    },

    fetchJson: async function (url, options) {
      const response = await fetch(url, Object.assign({
        headers: {
          "accept": "application/json",
          "content-type": "application/json"
        }
      }, options || {}));

      if (!response.ok) {
        throw new Error(`${url} returned HTTP ${response.status}: ${await response.text()}`);
      }

      return response.status === 204 ? {} : response.json();
    },

    getFinanceModel: function () {
      return this.getOwnerComponent().getModel("finance");
    },

    odataKey: function (id) {
      return `'${String(id).replace(/'/g, "''")}'`;
    },

    odataUuidKey: function (id) {
      return String(id);
    },

    statusState: function (status) {
      switch (status) {
        case "Paid":
          return "Success";
        case "PartiallyPaid":
        case "Open":
          return "Warning";
        case "Overdue":
        case "Cancelled":
          return "Error";
        default:
          return "None";
      }
    }
  });
});

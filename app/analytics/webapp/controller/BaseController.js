sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return Controller.extend("o2c.analytics.controller.BaseController", {
    getRouter: function () {
      return this.getOwnerComponent().getRouter();
    },

    getAnalyticsModel: function () {
      return this.getOwnerComponent().getModel("analytics");
    },

    loadAnalyticsData: async function () {
      const model = this.getAnalyticsModel();
      model.setProperty("/loading", true);
      model.setProperty("/error", "");

      try {
        const [orders, customers, monthly] = await Promise.all([
          this.fetchJson("/api/o2c/SalesOrders?$orderby=orderDate desc&$top=10"),
          this.fetchJson("/api/o2c/Customers?$orderby=creditLimit desc&$top=5"),
          this.fetchJson("/api/o2c/revenueByMonth(year=2026)")
        ]);

        const recentOrders = orders.value || [];
        const topCustomers = customers.value || [];
        const monthlyRevenue = (monthly.value || []).map(function (entry) {
          return {
            month: MONTHS[Number(entry.month) - 1] || String(entry.month),
            revenue: Number(entry.revenue || 0),
            orderCount: Number(entry.orderCount || 0)
          };
        });

        const statusMap = recentOrders.reduce(function (map, order) {
          map[order.status] = (map[order.status] || 0) + 1;
          return map;
        }, {});

        const statusData = Object.keys(statusMap).map(function (status) {
          return {
            status: status,
            orderCount: statusMap[status]
          };
        });

        const totalRevenue = recentOrders.reduce(function (sum, order) {
          return sum + Number(order.totalAmount || 0);
        }, 0);

        model.setProperty("/recentOrders", recentOrders);
        model.setProperty("/topCustomers", topCustomers);
        model.setProperty("/monthlyRevenue", monthlyRevenue);
        model.setProperty("/statusData", statusData);
        model.setProperty("/totalRevenue", totalRevenue);
        model.setProperty("/totalRevenueDisplay", String(Math.round(totalRevenue / 1000)));
        model.setProperty("/openOrders", statusMap.Submitted || 0);
        model.setProperty("/invoicedOrders", statusMap.Invoiced || 0);
        model.setProperty("/paidOrders", statusMap.Paid || 0);
      } catch (error) {
        model.setProperty("/error", error.message || "Unable to load analytics data");
      } finally {
        model.setProperty("/loading", false);
      }
    },

    fetchJson: async function (url) {
      const response = await fetch(url, {
        headers: {
          "accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`${url} returned HTTP ${response.status}`);
      }

      return response.json();
    },

    statusState: function (status) {
      switch (status) {
        case "Approved":
        case "Paid":
          return "Success";
        case "Submitted":
        case "Invoiced":
          return "Warning";
        case "Rejected":
        case "Cancelled":
          return "Error";
        default:
          return "None";
      }
    }
  });
});

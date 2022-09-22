const mysql = require("./mysql");
const fflogs = require("./fflogs");
const express = require("./express");
const gql = require("./gql");
const webhook = require("./webhook");

const cron = require("node-cron");

module.exports = {
  init: () => {
    mysql.init();
    fflogs.updateAccessToken().then(() => gql.init());
    express.init();
    setTimeout(() => {
      cron.schedule("*/30 * * * * *", () => {
        try {
          gql.createReport();
        } catch (error) {
          console.log("gql.createReport", error);
          webhook.send(
            process.env.NOTIFICATION_WEBHOOK_URL,
            `gql.createReport\n\n${error.message}`
          );
        }
      });
      cron.schedule("*/10 * * * * *", async () => {
        try {
          const report = await mysql.getFetchReport();
          if (!report) return;
          console.log("report", report);
          const data = await gql.getReportData(report.code, report.fight_id);
          if (!data) return;
          await webhook.send(report.webhook_url, data);
          await mysql.successReport(report.id);
        } catch (error) {
          console.log("cron.schedule", error);
          webhook.send(
            process.env.NOTIFICATION_WEBHOOK_URL,
            `cron.schedule\n\n${error.stack}`
          );
        }
      });
    }, 3000);
  },
};

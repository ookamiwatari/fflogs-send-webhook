const mysql = require('./mysql');
const fflogs = require('./fflogs');
const express = require('./express');
const gql = require('./gql');
const webhook = require('./webhook');

const cron = require('node-cron');

module.exports = {
	init: () => {
		mysql.init();
		fflogs.updateAccessToken().then(() => gql.init());
		express.init();
		setTimeout(() => {
			cron.schedule('*/30 * * * * *', () => gql.createReport());
			cron.schedule('*/3 * * * * *', async () => {
				const report = await mysql.getFetchReport();
				const data = await gql.getReportData(report.code, report.fight_id);
				await webhook.send(report.webhook_url, data);
				await mysql.successReport(report.id);
			});
		}, 3000);
	}
}

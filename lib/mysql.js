const mysql = require('mysql2/promise');

let connection;

let fetchUserList = [];
let fetchCharacterList = [];
let fetchEncounterList = [];

const cached_report_list = [];

module.exports = {

	init: () => {
		mysql.createConnection(process.env.CLEARDB_DATABASE_URL).then((result) => {
			connection = result;
			module.exports.updateFetchUserList();
			module.exports.updateFetchCharacterList();
			module.exports.updateFetchEncounterList();
			module.exports.initCachedReportList();
		});
	},

	initCachedReportList: async () => {
		const result = await connection.execute('SELECT * FROM report');
		for (const report of result[0]) {
			cached_report_list.push({
				code: report.code,
				fightId: report.fight_id,
				webhookUrl: report.webhook_url
			});
		}
	},

	updateFetchUserList: async () => {
		const result = await connection.execute('SELECT * FROM fetch_user')
		fetchUserList = result[0];
	},

	getFetchUserList: () => {
		return fetchUserList;
	},

	updateFetchCharacterList: async () => {
		const result = await connection.execute('SELECT * FROM fetch_character');
		fetchCharacterList = result[0];
	},

	getFetchCharacterList: () => {
		return fetchCharacterList;
	},

	updateFetchEncounterList: async () => {
		const result = await connection.execute('SELECT * FROM fetch_encounter');
		fetchEncounterList = result[0];;
	},

	getFetchEncounterList: () => {
		return fetchEncounterList;
	},

	reserveReport: async (code, fight_id, webhook_url, initialized) => {
		if (cached_report_list.find((report) => report.code === code && report.fightId === fight_id && report.webhookUrl === webhook_url)) return;
		cached_report_list.push({
			code: code,
			fightId: fight_id,
			webhookUrl: webhook_url
		});
		const counts = await connection.execute(`SELECT COUNT(*) FROM report WHERE code = "${code}" AND fight_id = ${fight_id} AND webhook_url = "${webhook_url}" LIMIT 1`);
		const result = await connection.execute(`INSERT INTO report (code, fight_id, webhook_url, finished) VALUES ("${code}", ${fight_id}, "${webhook_url}", ${!initialized})`)
	},

	getFetchReport: async () => {
		const result = await connection.execute(`SELECT * FROM report WHERE finished = 0 AND fetch_date < ${Math.floor(new Date().getTime() / 1000 - 120)} LIMIT 1`);
		if (!result[0].length) return;
		await connection.execute(`UPDATE report SET fetch_date = ${Math.floor(new Date().getTime() / 1000)} where id=${result[0][0].id}`);
		return result[0][0];
	},

	successReport: async (id) => {
		return await connection.execute(`UPDATE report SET finished = 1 where id=${id}`);
	}

}

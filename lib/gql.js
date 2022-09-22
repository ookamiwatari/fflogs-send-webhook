const mysql = require("./mysql");
const fflogs = require("./fflogs");

const GraphQLClient = require("graphql-request").GraphQLClient;

let gqlClient;
let zones;

module.exports = {
  init: async () => {
    gqlClient = new GraphQLClient("https://www.fflogs.com/api/v2/client/", {
      headers: {
        authorization: "Bearer " + fflogs.getAccessToken(),
      },
    });
    const query = "{ worldData { zones { id name encounters { id name } } } }";
    const data = await gqlClient.request(query).catch((error) => {
      console.log("gql.init", error.message);
      return Promise.reject(error);
    });
    zones = data.worldData.zones;
  },

  createReport: async () => {
    const user_list = mysql.getFetchUserList();
    const character_list = mysql.getFetchCharacterList();
    const encounter_list = mysql.getFetchEncounterList();
    const query =
      "" +
      "{ reportData { " +
      user_list
        .map((user) => {
          return `r${user.id}: reports(userID: ${user.user_id}, limit: 1) { data { rankings code } }`;
        })
        .join(" ") +
      " } characterData { " +
      character_list
        .map((character) => {
          return (
            "" +
            `c${character.id}: character (id: ${character.character_id}) { name ` +
            encounter_list
              .map((encounter) => {
                return `e${encounter.encounter_id}: encounterRankings(encounterID: ${encounter.encounter_id})`;
              })
              .join(" ") +
            " } "
          );
        })
        .join(" ") +
      "} " +
      "}";
    const data = await gqlClient.request(query).catch((error) => {
      console.log("gql.createReport", error.message);
      return Promise.reject(error);
    });
    for (const [key, report] of Object.entries(data.reportData)) {
      for (const ranking of report.data[0].rankings.data) {
        mysql.reserveReport(
          report.data[0].code,
          ranking.fightID,
          user_list.find((user) => user.id === +key.slice(1)).webhook_url,
          user_list.find((user) => user.id === +key.slice(1)).initialized
        );
      }
    }
    for (const [key, character] of Object.entries(data.characterData)) {
      for (const encounter of encounter_list) {
        for (const rank of character["e" + encounter.encounter_id].ranks) {
          mysql.reserveReport(
            rank.report.code,
            rank.report.fightID,
            character_list.find((char) => char.id === +key.slice(1))
              .webhook_url,
            character_list.find((char) => char.id === +key.slice(1)).initialized
          );
        }
      }
    }
  },

  getReportData: async (code, fight_id) => {
    // TODO: 古いログの場合に timeframe を Historical に変更
    const query = `{
				reportData {
					report(code: "${code}") {
						rankings(fightIDs: ${fight_id}, timeframe: Today)
						fights(fightIDs: ${fight_id}) {
							name
							startTime
							endTime
							gameZone {
								id
								name
							}
							encounterID
						}
						table_damage: table(fightIDs: ${fight_id}, endTime: 1814400000, dataType: DamageDone)
						table_death: table(fightIDs: ${fight_id}, endTime: 1814400000, dataType: Deaths)
						revival_whm: table(fightIDs: ${fight_id}, endTime: 1814400000, dataType: Casts, abilityID: 125)
						revival_thm: table(fightIDs: ${fight_id}, endTime: 1814400000, dataType: Casts, abilityID: 173)
						revival_ast: table(fightIDs: ${fight_id}, endTime: 1814400000, dataType: Casts, abilityID: 3603)
						revival_sge: table(fightIDs: ${fight_id}, endTime: 1814400000, dataType: Casts, abilityID: 24287)
						revival_rdm: table(fightIDs: ${fight_id}, endTime: 1814400000, dataType: Casts, abilityID: 7523)
					}
				}
			}`;
    const result = await gqlClient.request(query).catch((error) => {
      console.log("gql.getReportData", error.message);
      return Promise.reject(error);
    });

    console.log("result", result);

    const report = result.reportData.report;
    const fight = report.fights[0];
    const ranking = report.rankings.data[0];

    console.log("fight", fight);
    if (!fight) return;

    const battle_time = fight.endTime - fight.startTime;

    // プレイヤーリストを生成
    const players = [];
    for (const entrie of report.table_damage.data.entries) {
      players.push({
        name: entrie.name,
        rdps: (entrie.totalRDPS / battle_time) * 1000,
        adps: (entrie.totalADPS / battle_time) * 1000,
        ndps: (entrie.totalNDPS / battle_time) * 1000,
        death: 0,
        isRevival: false,
        perf: "---",
        type: entrie.type,
      });
    }

    // perfをうんぬん
    for (const character of ranking.roles.tanks.characters) {
      if (character.id_2) continue;
      const player = players.find((p) => p.name === character.name);
      if (!player) continue;
      player.perf = (" " + character.rankPercent).slice(-2) + "%";
    }
    for (const character of ranking.roles.healers.characters) {
      if (character.id_2) continue;
      const player = players.find((p) => p.name === character.name);
      if (!player) continue;
      player.perf = (" " + character.rankPercent).slice(-2) + "%";
    }
    for (const character of ranking.roles.dps.characters) {
      if (character.id_2) continue;
      const player = players.find((p) => p.name === character.name);
      if (!player) continue;
      player.perf = (" " + character.rankPercent).slice(-2) + "%";
    }

    // 死亡回数をうんぬん
    for (const character of report.table_death.data.entries) {
      const player = players.find((p) => p.name === character.name);
      if (!player) continue;
      ++player.death;
    }

    // 蘇生回数をうんぬん
    for (const character of report.revival_whm.data.entries) {
      const player = players.find((p) => p.name === character.name);
      if (!player) continue;
      player.isRevival = true;
    }
    for (const character of report.revival_thm.data.entries) {
      const player = players.find((p) => p.name === character.name);
      if (!player) continue;
      player.isRevival = true;
    }
    for (const character of report.revival_ast.data.entries) {
      const player = players.find((p) => p.name === character.name);
      if (!player) continue;
      player.isRevival = true;
    }
    for (const character of report.revival_sge.data.entries) {
      const player = players.find((p) => p.name === character.name);
      if (!player) continue;
      player.isRevival = true;
    }
    for (const character of report.revival_rdm.data.entries) {
      const player = players.find((p) => p.name === character.name);
      if (!player) continue;
      player.isRevival = true;
    }

    // rDPS順にソート
    players.sort((a, b) => b.adps - a.adps);

    // TODO: playersが空の場合のエラー処理

    const str =
      `https://ja.fflogs.com/reports/${code}#fight=${fight_id}&type=summary\n` +
      `【${fight.name}】${fight.gameZone.name} ${(
        "00" + Math.floor(battle_time / 60000)
      ).slice(-2)}:${("00" + (Math.floor(battle_time / 1000) % 60)).slice(
        -2
      )}` +
      `\`\`\`` +
      players
        .map((p) => {
          return (
            "" +
            `${p.perf} ${p.name} (${p.type}) ${p.rdps.toFixed(1)}` +
            (p.death ? ` <${p.death}death>` : "") +
            (p.isRevival ? " *" : "")
          );
        })
        .join("\n") +
      `\`\`\``;
    return str;
  },
};

// 環境変数の読み込み
require("dotenv").config();

const webhook = require("./lib/webhook");
const schedule = require("./lib/schedule");

try {
  schedule.init();
} catch (error) {
  console.log("schedule.init", error);
  webhook.send(
    process.env.NOTIFICATION_WEBHOOK_URL,
    `schedule.init\n\n${error.message}`
  );
}

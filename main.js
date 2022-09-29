// 環境変数の読み込み
require("dotenv").config();

const schedule = require("./lib/schedule");
const mysql = require("./lib/mysql");
const fflogs = require("./lib/fflogs");
const express = require("./lib/express");
const gql = require("./lib/gql");

express.init();
initAll();

async function initAll() {
  try {
    await mysql.init();
    await fflogs.updateAccessToken();
    await gql.init();
    schedule.init();
  } catch (e) {
    console.log("main.js - Error", e);
    setTimeout(() => {
      initAll();
    }, 60000);
  }
}

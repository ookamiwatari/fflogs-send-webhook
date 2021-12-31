// 環境変数の読み込み
require('dotenv').config();

const gql = require('./lib/gql');
const schedule = require('./lib/schedule');

schedule.init();

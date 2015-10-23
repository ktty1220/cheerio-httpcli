#!/usr/bin/env node
/*eslint no-console:0*/
'use strict';

/**
 * Promise形式での利用サンプル
 */


var client = require('../index');

// なんとなくgooglebotのUser-Agentをセット
client.setBrowser('googlebot');

// Yahooのトップページを取得
client.fetch('http://www.yahoo.co.jp/')
.then(function (result) {
  console.log('<then>', result.$('title').text());
  // Googleのトップページを取得
  return client.fetch('http://www.google.co.jp/');
}).then(function (result) {
  console.log('<then>', result.$('title').text());
  // 例外を発生させる
  throw new Error('<error>');
}).catch(function (err) {
  // 例外発生時の処理
  console.log('<catch>', err);
}).finally(function () {
  // 最終的に必ず実行される処理
  console.log('<finally>');
});

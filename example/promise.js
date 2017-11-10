#!/usr/bin/env node
/*jshint -W100*/

'use strict';

/**
 * Promise形式での利用サンプル
 */


var client = require('../index');

// なんとなくgooglebotのUser-Agentをセット
client.set('browser', 'googlebot');

// Yahooのトップページを取得
client.fetch('http://www.yahoo.co.jp/')
.then(function (result) {
  console.info('<then>', result.$('title').text());
  // Googleのトップページを取得
  return client.fetch('http://www.google.co.jp/');
}).then(function (result) {
  console.info('<then>', result.$('title').text());
  // 例外を発生させる
  throw new Error('!!! error !!!');
}).catch(function (err) {
  // 例外発生時の処理
  console.error('<catch>', err.message);
}).finally(function () {
  // 最終的に必ず実行される処理
  console.info('<finally>');
});

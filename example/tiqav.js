#!/usr/bin/env node
/*eslint no-console:0,no-invalid-this:0*/
'use strict';

/**
 * tiqav画像取得サンプル
 */

var fs     = require('fs');
var path   = require('path');
var client = require('../index');

// 画像保存フォルダ作成
var imgdir = path.join(__dirname, 'img');
fs.mkdirSync(imgdir);

client.download
.on('success', function (url, buffer) {
  // ダウンロード完了時の処理(各ファイルごとに呼ばれる)
  var file = url.match(/([^\/]+)$/)[1];
  var savepath = path.join(imgdir, file);
  fs.writeFileSync(savepath, buffer, 'binary');
  console.log(url + 'を' + savepath + 'にダウンロードしました');
  console.log('[ダウンロード状況]', this.state);
})
.on('error', function (err) {
  // ダウンロード失敗時の処理(各ファイルごとに呼ばれる)
  console.log('画像取得エラー', err);
  console.log('[ダウンロード状況]', this.state);
});

console.log('tiqavにアクセスします');
client.fetch('http://tiqav.com/')
.then(function (result) {
  // 画像を根こそぎダウンロード
  result.$('.box img').download();
})
.catch(function (err) {
  console.log('エラーが発生しました');
  console.log(err);
})
.finally(function () {
  console.log('終了します');
});

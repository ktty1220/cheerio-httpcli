#!/usr/bin/env node
/*eslint no-invalid-this:0*/
/*jshint -W100*/

'use strict';

var C = require('colors/safe');

/**
 * tiqav画像取得サンプル
 */

var fs     = require('fs');
var path   = require('path');
var client = require('../index');

// 画像保存フォルダ作成
var imgdir = path.join(__dirname, 'img');
if (! fs.existsSync(imgdir)) {
  fs.mkdirSync(imgdir);
}

// ダウンロードマネージャー設定
client.download
.on('ready', function (stream) {
  // ダウンロード完了時の処理(各ファイルごとに呼ばれる)
  var file = stream.url.pathname.match(/([^\/]+)$/)[1];
  var savepath = path.join(imgdir, file);
  stream.pipe(fs.createWriteStream(savepath));
  console.info(C.green('SUCCESS'), C.blue(stream.url.href) + ' => ' + C.yellow(savepath));
  console.info(C.magenta('STATE'), this.state);
})
.on('error', function (err) {
  // ダウンロード失敗時の処理(各ファイルごとに呼ばれる)
  console.error(C.red('ERROR'), err);
  console.info(C.magenta('STATE'), this.state);
})
.on('end', function (err) {
  // ダウンロードキューが空になった時の処理
  console.info(C.green.bold('COMPLETE'), this.state);
});


// fetch start
console.info(C.cyan('INFO'), 'tiqavにアクセスします');
client.fetch('http://tiqav.com/')
.then(function (result) {
  // 画像を根こそぎダウンロード
  var $imgs = result.$('.box img');
  console.info(C.cyan('INFO'), $imgs.length + '個の画像があります');
  $imgs.download();
})
.catch(function (err) {
  console.error(C.red('ERROR'), err);
})
.finally(function () {
  console.info(C.cyan('INFO'), 'スクレイピングが終了しました');
});

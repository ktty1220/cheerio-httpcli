#!/usr/bin/env node
'use strict';

var C = require('colors/safe');

/**
 * いらすとやTOPの人気イラスト画像取得サンプル
 */

var fs = require('fs');
var path = require('path');
var client = require('../index');

// 画像保存フォルダ作成
var imgdir = path.join(__dirname, 'img');
if (!fs.existsSync(imgdir)) {
  fs.mkdirSync(imgdir);
}

// ダウンロードマネージャー設定
client.download
  .on('add', function (url) {
    console.log(C.blue('NEW'), url);
  })
  .on('ready', function (stream) {
    // ダウンロード完了時の処理(各ファイルごとに呼ばれる)
    var file = stream.url.pathname.match(/([^/]+)$/)[1];
    var savepath = path.join(imgdir, file);
    stream
      .saveAs(savepath)
      .then(function () {
        // 書き込み完了
        console.log(C.green('SUCCESS'), C.blue(stream.url.href) + ' => ' + C.yellow(savepath));
        console.log(C.magenta('STATE'), client.download.state);
      })
      .catch(console.error);
  })
  .on('error', function (err) {
    // ダウンロード失敗時の処理(各ファイルごとに呼ばれる)
    console.error(C.red('ERROR'), err);
    console.log(C.magenta('STATE'), this.state);
  })
  .on('end', function () {
    // ダウンロードキューが空になった時の処理
    console.log(C.green.bold('COMPLETE'), this.state);
  });

// fetch start
console.log(C.cyan('INFO'), 'いらすとやにアクセスします');
client
  .fetch('https://www.irasutoya.com/')
  .then(function (result) {
    console.log(C.cyan('INFO'), '人気のイラストをダウンロードします');
    var $imgs = result.$('.popular-posts .item-thumbnail img');
    // png画像のみダウンロード
    $imgs.each(function () {
      if (/\.png$/.test(result.$(this).attr('src'))) {
        result.$(this).download();
      }
    });
  })
  .catch(function (err) {
    console.error(C.red('ERROR'), err);
  })
  .finally(function () {
    console.log(C.cyan('INFO'), 'スクレイピングが終了しました');
  });

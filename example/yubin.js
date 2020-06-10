#!/usr/bin/env node
'use strict';

var C = require('colors/safe');

/**
 * 郵便番号データダウンロードサンプル
 */

var path = require('path');
var client = require('../index');

// ダウンロードマネージャー設定
client.download
  .on('add', function (url) {
    console.log(C.blue('NEW'), url);
  })
  .on('ready', function (stream) {
    // ダウンロード完了時の処理(各ファイルごとに呼ばれる)
    var file = stream.url.pathname.match(/([^/]+)$/)[1];
    var savepath = path.join(__dirname, file);
    stream.saveAs(savepath, function (err) {
      if (err) {
        console.error(err);
        return;
      }
      // 書き込み完了
      console.log(C.green('SUCCESS'), C.blue(stream.url.href) + ' => ' + C.yellow(savepath));
      console.log(C.magenta('STATE'), client.download.state);
    });
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
client
  .fetch('https://www.post.japanpost.jp/zipcode/dl/kogaki-zip.html')
  .then(function (result) {
    console.log(C.cyan('INFO'), '東京都の郵便番号データをダウンロードします');
    result.$('a[href*="/zip/13tokyo.zip"]').download();
  })
  .catch(function (err) {
    console.error(C.red('ERROR'), err);
  })
  .finally(function () {
    console.log(C.cyan('INFO'), 'スクレイピングが終了しました');
  });

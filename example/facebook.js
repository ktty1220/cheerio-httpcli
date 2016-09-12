#!/usr/bin/env node
/*jshint -W100*/

'use strict';

/**
 *****************************************************************
 * !!! このサンプルは2015-08-30現在のfacebookでは動作しません !!!
 *****************************************************************
 * facebookログインサンプル
 *
 * 以下のusernameとpasswordを書き換えてから実行してください
 */
var username = 'hogehoge';
var password = 'fugafuga';


var client = require('../index');

console.info('facebookTOPページにアクセスします');
client.fetch('http://www.facebook.com/')
.then(function (result) {
  console.info('ログインフォームを送信します');
  return result.$('#login_form').submit({
    email: username,
    pass: password
  });
})
.then(function (result) {
  console.info('クッキー', result.response.cookies);
  console.info('ユーザー名を取得します');
  console.info(result.$('._2dpb').text());
})
.catch(function (err) {
  console.error('エラーが発生しました', err);
})
.finally(function () {
  console.info('終了します');
});

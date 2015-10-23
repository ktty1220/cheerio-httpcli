#!/usr/bin/env node
/*eslint no-console:0*/
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

console.log('facebookTOPページにアクセスします');
client.fetch('http://www.facebook.com/')
.then(function (result) {
  console.log('ログインフォームを送信します');
  return result.$('#login_form').submit({
    email: username,
    pass: password
  });
})
.then(function (result) {
  console.log('クッキー', result.response.cookies);
  console.log('ユーザー名を取得します');
  console.log(result.$('._2dpb').text());
})
.catch(function (err) {
  console.log('エラーが発生しました');
  console.log(err);
})
.finally(function () {
  console.log('終了します');
});


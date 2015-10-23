#!/usr/bin/env node
/*eslint no-console:0*/
'use strict';

/**
 * ニコニコ動画ログインサンプル
 *
 * 以下のusernameとpasswordを書き換えてから実行してください
 */
var username = 'hogehoge';
var password = 'fugafuga';


var client = require('../index');

console.log('ニコニコTOPページにアクセスします');
client.fetch('http://nicovideo.jp/')
.then(function (result) {
  console.log('ログインリンクをクリックします');
  return result.$('#sideNav .loginBtn').click();
})
.then(function (result) {
  console.log('ログインフォームを送信します');
  return result.$('#login_form').submit({
    mail_tel: username,
    password: password
  });
})
.then(function (result) {
  console.log('ログイン可否をチェックします');
  if (! result.response.headers['x-niconico-id']) {
    throw new Error('login failed');
  }
  console.log('クッキー', result.response.cookies);
  console.log('マイページに移動します');
  return client.fetch('http://www.nicovideo.jp/my/top');
})
.then(function (result) {
  console.log('マイページに表示されるアカウント名を取得します');
  console.log(result.$('#siteHeaderUserNickNameContainer').text());
})
.catch(function (err) {
  console.log('エラーが発生しました');
  console.log(err);
})
.finally(function () {
  console.log('終了します');
});

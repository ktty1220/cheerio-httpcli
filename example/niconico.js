#!/usr/bin/env node
/*jshint -W100*/

'use strict';

/**
 * ニコニコ動画ログインサンプル
 *
 * 以下のusernameとpasswordを書き換えてから実行してください
 */
var username = 'hogehoge';
var password = 'fugafuga';


var client = require('../index');

console.info('ニコニコTOPページにアクセスします');
client.fetch('http://nicovideo.jp/')
.then(function (result) {
  console.info('ログインリンクをクリックします');
  return result.$('#sideNav .loginBtn').click();
})
.then(function (result) {
  console.info('ログインフォームを送信します');
  return result.$('#login_form').submit({
    mail_tel: username,
    password: password
  });
})
.then(function (result) {
  console.info('ログイン可否をチェックします');
  if (! result.response.headers['x-niconico-id']) {
    throw new Error('login failed');
  }
  console.info('クッキー', result.response.cookies);
  console.info('マイページに移動します');
  return client.fetch('http://www.nicovideo.jp/my/top');
})
.then(function (result) {
  console.info('マイページに表示されるアカウント名を取得します');
  console.info(result.$('#siteHeaderUserNickNameContainer').text());
})
.catch(function (err) {
  console.error('エラーが発生しました', err.message);
})
.finally(function () {
  console.info('終了します');
});

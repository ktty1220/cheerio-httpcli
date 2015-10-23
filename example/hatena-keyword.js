#!/usr/bin/env node
/*eslint no-console:0, no-invalid-this:0*/
'use strict';

/**
 * はてなキーワード検索サンプル
 *
 * 以下のword変数の内容で検索します
 */
var word = 'ネッシー';


var client = require('../index');

console.log('はてなキーワードTOPページにアクセスします');
client.fetch('http://d.hatena.ne.jp/keyword/')
.then(function (result) {
  console.log('最近更新されたキーワード一覧');
  var $ = result.$;
  $('#updatekeywords ul li .name').each(function (idx) {
    // NEW!は邪魔なので削除
    $('.new', $(this)).remove();
    console.log('* ' + $(this).text());
  });
  console.log('「' + word + '」を検索します');
  return $('#index-search').submit({
    word: word
  });
})
.then(function (result) {
  console.log(result.$('.keyword-body').text().trim().replace(/[\u0009\u3000]/g, ''));
})
.catch(function (err) {
  console.log('エラーが発生しました');
  console.log(err);
})
.finally(function () {
  console.log('終了します');
});

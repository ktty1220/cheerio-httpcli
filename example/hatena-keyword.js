#!/usr/bin/env node
/*eslint no-invalid-this:0*/
/*jshint -W100*/

'use strict';

/**
 * はてなキーワード検索サンプル
 *
 * 以下のword変数の内容で検索します
 */
var word = 'ネッシー';


var client = require('../index');

console.info('はてなキーワードTOPページにアクセスします');
client.fetch('http://d.hatena.ne.jp/keyword/')
.then(function (result) {
  console.info('最近更新されたキーワード一覧');
  var $ = result.$;
  $('#updatekeywords ul li .name').each(function () {
    // NEW!は邪魔なので削除
    $('.new', $(this)).remove();
    console.info('* ' + $(this).text());
  });
  console.info('「' + word + '」を検索します');
  return $('#index-search').submit({
    word: word
  });
})
.then(function (result) {
  console.info(result.$('.keyword-body').text().trim().replace(/[\t\u3000]/g, ''));
})
.catch(function (err) {
  console.error('エラーが発生しました', err);
})
.finally(function () {
  console.info('終了します');
});

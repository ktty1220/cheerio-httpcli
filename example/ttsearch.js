#!/usr/bin/env node
/*eslint no-console:0, no-invalid-this:0*/
'use strict';

/**
 * 2chスレタイ検索サンプル
 *
 * 以下のword変数の内容で検索します
 */
var word = '話題';


var client = require('../index');

client.fetch('http://ttsearch.net/')
.then(function (result) {
  return result.$('form').eq(0).submit({
    k: word
  });
})
.then(function (result) {
  var $ = result.$;
  var results = [];
  $('a.title').each(function (idx) {
    results.push({
      title: $(this).text().trim(),
      url: $(this).attr('href')
    });
  });
  console.log(results);
})
.catch(function (err) {
  console.log('エラーが発生しました');
  console.log(err);
})
.finally(function () {
  console.log('終了します');
});


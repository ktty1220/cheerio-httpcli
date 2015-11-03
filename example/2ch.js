#!/usr/bin/env node
/*eslint no-console:0, no-invalid-this:0*/
'use strict';

/**
 * 2ちゃんねる検索サンプル
 *
 * 以下のword変数の内容で検索します
 */
var word = 'ぬるぽ';


var client = require('../index');

client.fetch('http://www.2ch.net/')
.then(function (result) {
  return result.$('form').eq(0).submit({
    q: word
  });
})
.then(function (result) {
  var $ = result.$;
  var results = [];
  $('.box').each(function (idx) {
    var $a = $(this).find('a').eq(0);
    results.push({
      title: $a.text().trim(),
      url: $a.attr('href'),
      timestamp: $(this).find('.timestamp').text().trim()
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

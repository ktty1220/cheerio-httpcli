#!/usr/bin/env node
/*eslint no-invalid-this:0*/
/*jshint -W100*/

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
  $('.list_line').each(function () {
    var $a = $(this).find('a').eq(0);
    results.push({
      title: $a.text().trim(),
      url: $a.attr('href'),
      info: $(this).find('.list_line_info_container').text().trim()
    });
  });
  console.info(results);
})
.catch(function (err) {
  console.error('エラーが発生しました', err);
})
.finally(function () {
  console.info('終了します');
});

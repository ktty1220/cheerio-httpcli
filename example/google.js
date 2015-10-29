#!/usr/bin/env node
/*eslint no-console:0, no-invalid-this:0*/
'use strict';

/**
 * Google検索サンプル
 *
 * 以下のword変数の内容で検索します
 */
var word = 'ドラえもん';


var client = require('../index');

client.fetch('http://www.google.co.jp/search', { q: word }, function (err, $, res, body) {
  if (err) {
    return console.error(err);
  }

  var results = [];
  // 検索結果が個別に格納されている要素をループ
  $('#rso .g').each(function (idx) {
    // 各検索結果のタイトル部分とURL、概要を取得
    var $h3 = $(this).find('h3');
    var url = $h3.find('a').attr('href');
    if (url) {
      results.push({
        title: $h3.text(),
        url: url,
        description: $(this).find('.st').text()
      });
    }
  });

  console.log(results);
});

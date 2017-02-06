#!/usr/bin/env node
/*eslint no-invalid-this:0*/
/*jshint -W100*/

'use strict';

/**
 * Google検索サンプル
 *
 * 以下のword変数の内容で検索します
 */
var word = 'ドラえもん';


var client = require('../index');

// [重要] google検索の場合はfollowMetaRefreshをfalseにする(README.md参照)
client.set('followMetaRefresh', false);

client.fetch('http://www.google.co.jp/search', { q: word }, function (err, $, res, body) {
  if (err) {
    console.error(err);
    return;
  }

  var results = [];
  // 検索結果が個別に格納されている要素をループ
  $('#rso .g').each(function () {
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

  console.info(results);
});

#!/usr/bin/env node

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
  $('h3').each(function () {
    // 各検索結果のタイトル部分とURLを取得
    var url = $(this).closest('a').attr('href');
    if (url) {
      results.push({
        title: $(this).text(),
        url: url
      });
    }
  });

  console.log(results);
});

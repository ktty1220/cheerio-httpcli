#!/usr/bin/env node
/*eslint no-invalid-this:0*/
/*jshint -W100*/

'use strict';

/**
 * 同期リクエストによるGoogle検索サンプル
 *
 * 以下のword変数の内容で検索します
 */
var word = 'チュパカブラ';


var client = require('../index');

// [重要] google検索の場合はfollowMetaRefreshをfalseにする(README.md参照)
client.set('followMetaRefresh', false);

console.info('--- Bingで検索 ---');
var result1 = client.fetchSync('http://www.bing.com/search', { q: word });
if (result1.error) {
  console.error(result1.error);
} else {
  var results1 = [];
  // 検索結果が個別に格納されている要素をループ
  var $ = result1.$;
  $('.b_algo').each(function () {
    // 各検索結果のタイトル部分とURL、概要を取得
    var $h2 = $(this).find('h2');
    var url = $h2.find('a').attr('href');
    if (url) {
      results1.push({
        title: $h2.text(),
        url: url,
        description: $(this).find('.b_caption p').text()
      });
    }
  });
  console.info(results1);
}

console.info('\n--- Googleで検索 ---');
var result2 = client.fetchSync('http://www.google.co.jp/search', { q: word });
if (result2.error) {
  console.error(result2.error);
} else {
  var results2 = [];
  // 検索結果が個別に格納されている要素をループ
  var _$ = result2.$;
  _$('#rso .g').each(function () {
    // 各検索結果のタイトル部分とURL、概要を取得
    var $h3 = _$(this).find('h3');
    var url = $h3.find('a').attr('href');
    if (url) {
      results2.push({
        title: $h3.text(),
        url: url,
        description: _$(this).find('.st').text()
      });
    }
  });
  console.info(results2);
}

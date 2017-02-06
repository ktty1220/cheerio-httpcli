#!/usr/bin/env node
/*eslint no-invalid-this:0*/
/*jshint -W100*/

'use strict';

/**
 *****************************************************************
 * !!! 2017-02-06現在サイトが消えているので動作しません !!!
 *****************************************************************
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
  $('a.title').each(function () {
    results.push({
      title: $(this).text().trim(),
      url: $(this).attr('href')
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

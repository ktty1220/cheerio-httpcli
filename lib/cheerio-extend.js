/*eslint no-invalid-this:0*/
'use strict';

var cheerio   = require('cheerio');

/**
 * cheerioオブジェクト拡張モジュール(プロトタイプにメソッド追加)
 */
module.exports = function (encoding, client) {
  [
    'text-html',
    'click',
    'submit',
    'tick-untick',
    'absolute'
  ].forEach(function (m) {
    require('./cheerio/' + m)(encoding, client, cheerio);
  });

  return cheerio;
};

'use strict';

var cheerio = require('cheerio');
var each = require('foreach');

/**
 * cheerioオブジェクト拡張モジュール(プロトタイプにメソッド追加)
 */
module.exports = function (Client) {
  each(['html', 'click', 'submit', 'tick-untick', 'field', 'url', 'download'], function (m) {
    require('./cheerio/' + m)(cheerio, Client);
  });

  return cheerio;
};

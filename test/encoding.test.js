var vows = require('vows');
var assert = require('assert');
var cli = require('../lib/cheerio-httpcli');
cli.setIconvEngine('iconv-lite');

vows.describe('encoding test')
.addBatch({
  'encoding: x-sjis(= shift_jis)': {
    topic: function () {
      cli.fetch('http://www2.2ch.net/2ch.html', this.callback);
    },
    'it succeeded in http get, convert to utf-8, parse html': function (topic) {
      assert.equal(topic('title').text(), '　■2ch BBS ..');
    }
  },
  'encoding: utf-8': {
    topic: function () {
      cli.fetch('http://www.yahoo.co.jp/', this.callback);
    },
    'it succeeded in http get, convert to utf-8, parse html': function (topic) {
      assert.equal(topic('.help').text(), 'ヘルプ');
    }
  },
  'encoding: utf-8(html5)': {
    topic: function () {
      cli.fetch('http://gunosy.com/', this.callback);
    },
    'it succeeded in http get, convert to utf-8, parse html': function (topic) {
      assert.equal(topic('#box_info').text().trim(), 'お問い合わせ');
    }
  },
  'encoding: sjis': {
    topic: function () {
      cli.fetch('http://www.2ch.net/', this.callback);
    },
    'it succeeded in http get, convert to utf-8, parse html': function (topic) {
      assert.equal(topic('title').text(), '２ちゃんねる掲示板へようこそ');
    }
  },
  'encoding: euc-jp': {
    topic: function () {
      cli.fetch('http://www.rakuten.co.jp/', this.callback);
    },
    'it succeeded in http get, convert to utf-8, parse html': function (topic) {
      assert.equal(topic('#svcAshiato1 .svcAshiatoLabel .default').text(), 'サービス一覧');
    }
  },
  'encoding: euc-jp(html5)': {
    topic: function () {
      cli.fetch('http://d.hatena.ne.jp/hotkeyword', this.callback);
    },
    'it succeeded in http get, convert to utf-8, parse html': function (topic) {
      assert.equal(topic('h1').text(), '注目キーワード');
    }
  },
  'encoding: iso-2022-jp(iconv-lite not supported)': {
    topic: function () {
      var _this = this;
      cli.fetch('http://ash.jp/code/unitbl21.htm', function (err, $, res) {
        _this.callback(undefined, err);
      });
    },
    'error errno: 22': function (topic) {
      assert.equal(topic.errno, 22);
    },
    'error code: EINVAL': function (topic) {
      assert.equal(topic.code, 'EINVAL');
    },
    'error message: EINVAL, Conversion not supported.': function (topic) {
      assert.equal(topic.message, 'EINVAL, Conversion not supported.');
    },
    'error charset: "iso-2022-jp"': function (topic) {
      assert.equal(topic.charset, 'iso-2022-jp');
    },
    'error url: http://ash.jp/code/unitbl21.htm': function (topic) {
      assert.equal(topic.url, 'http://ash.jp/code/unitbl21.htm');
    }
  }
})
.export(module);

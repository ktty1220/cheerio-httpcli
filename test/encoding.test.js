var vows = require('vows');
var assert = require('assert');
var cli = require('../lib/cheerio-httpcli');

// need iconv-jp module for test
cli.setIconvEngine('iconv-jp');

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
  'encoding: iso-2022-jp': {
    topic: function () {
      cli.fetch('http://ash.jp/code/unitbl21.htm', this.callback);
    },
    'it succeeded in http get, convert to utf-8, parse html': function (topic) {
      assert.equal(topic('title').text(), 'Unicode対応 文字コード表');
    }
  }
})
.export(module);

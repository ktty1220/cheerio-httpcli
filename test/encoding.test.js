var vows = require('vows');
var assert = require('assert');
var cli = require('../lib/cheerio-httpcli');

vows.describe('basic test')
.addBatch({
  'encoding: x-sjis(not supported)': {
    topic: function () {
      var _this = this;
      cli.fetch('http://info.2ch.net/guide/', function (err, $) {
        _this.callback(undefined, err);
      });
    },
    'error errno: 22': function (topic) {
      assert.equal(topic.errno, 22);
    },
    'error charset: "x-sjis"': function (topic) {
      assert.equal(topic.charset, 'x-sjis');
    },
    'error url: http://info.2ch.net/guide/': function (topic) {
      assert.equal(topic.url, 'http://info.2ch.net/guide/');
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

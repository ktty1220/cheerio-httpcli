var vows = require('vows');
var assert = require('assert');
var cli = require('../lib/cheerio-httpcli');

vows.describe('iconv-module test')
.addBatch({
  'iconv: invalid module name': {
    'throw exception': function () {
      assert.throws(function () { cli.setIconvEngine('iconvjp'); });
    }
  }
})
.addBatch({
  'iconv: iso-2022-jp(use iconv-jp)': {
    topic: function () {
      cli.setIconvEngine('iconv-jp');
      cli.fetch('http://ash.jp/code/unitbl21.htm', this.callback);
    },
    'it succeeded in http get, convert to utf-8, parse html': function (topic) {
      assert.equal(topic('title').text(), 'Unicode対応 文字コード表');
    }
  }
})
.export(module);

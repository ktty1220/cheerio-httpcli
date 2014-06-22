var vows = require('vows');
var assert = require('assert');
var cli = require('../lib/cheerio-httpcli');

vows.describe('iconv-module test')
.addBatch({
  'iconv: invalid module name': {
    'throw exception': function () {
      assert.throws(function () { cli.setIconvEngine('iconvlite'); });
    }
  }
})
.addBatch({
  'iconv: iso-2022-jp (iconv-lite not supported)': {
    topic: function () {
      var _this = this;
      cli.setIconvEngine('iconv-lite');
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

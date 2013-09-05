var vows = require('vows');
var assert = require('assert');
var cli = require('../lib/cheerio-httpcli');

vows.describe('gzip:false test')
.addBatch({
  'gzip: false': {
    topic: function () {
      var _this = this;
      cli.gzip = false;
      cli.fetch('http://www.yahoo.co.jp/', function (err, $, res) {
        _this.callback(err, res);
      });
    },
    'not found "content-encoding: gzip" in response header': function (topic) {
      assert.isUndefined(topic.headers['content-encoding']);
    }
  }
})
.export(module);

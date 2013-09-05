var vows = require('vows');
var assert = require('assert');
var cli = require('../lib/cheerio-httpcli');

vows.describe('gzip(true) test')
.addBatch({
  'gzip: true(default)': {
    topic: function () {
      var _this = this;
      cli.gzip = true;
      cli.fetch('http://www.yahoo.co.jp/', function (err, $, res) {
        _this.callback(err, res);
      });
    },
    'found "content-encoding: gzip" in response header': function (topic) {
      assert.equal(topic.headers['content-encoding'], 'gzip');
    }
  }
})
.export(module);

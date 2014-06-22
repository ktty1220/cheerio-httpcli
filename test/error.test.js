var vows = require('vows');
var assert = require('assert');
var cli = require('../lib/cheerio-httpcli');

vows.describe('error test')
.addBatch({
  'error: not existing page': {
    topic: function () {
      var _this = this;
      cli.fetch('http://www.google.com/not-existing-page.html', { hoge: 'fuga' }, function (err, $, res) {
        _this.callback(undefined, {
          error: err,
          $: $
        });
      });
    },
    'error message: "server status"': function (topic) {
      assert.equal(topic.error.message, 'server status');
    },
    'error statusCode: 404': function (topic) {
      assert.equal(topic.error.statusCode, 404);
    },
    'error url: http://www.google.com/not-existing-page.html': function (topic) {
      assert.equal(topic.error.url, 'http://www.google.com/not-existing-page.html');
    },
    'error param: { hoge: "fuga" }': function (topic) {
      assert.deepEqual(topic.error.param, { hoge: 'fuga' });
    },
    'error content is defined': function (topic) {
      assert.equal(topic.$('title').text(), 'Error 404 (Not Found)!!1');
    }
  }, 
  'error: not existing host': {
    topic: function () {
      var _this = this;
      cli.fetch('http://not-existing-host/', { hoge: 'fuga' }, function (err, $, res) {
        _this.callback(undefined, {
          error: err,
          $: $
        });
      });
    },
    'error errno: ENOTFOUND': function (topic) {
      assert.equal(topic.error.errno, 'ENOTFOUND');
    },
    'error url: http://not-existing-host/': function (topic) {
      assert.equal(topic.error.url, 'http://not-existing-host/');
    },
    'error param: { hoge: "fuga" }': function (topic) {
      assert.deepEqual(topic.error.param, { hoge: 'fuga' });
    },
    'error content is not defined': function (topic) {
      assert.isUndefined(topic.$);
    }
  }
})
.export(module);

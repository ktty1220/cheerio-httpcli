/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert   = require('power-assert');
var helper   = require('./_helper');
var cli      = require('../index');

describe('locale', function () {
  it('デフォルトは実行環境のロケールがセットされる', function (done) {
    cli.fetch(helper.url('~info'), function (err, $, res, body) {
      // This test will be failed when executed on below environment.
      // - System language is not ja-JP
      // - Windows and Node.js v0.10 or lower
      assert(res.headers['accept-language'] === 'ja-JP,en-US');
      done();
    });
  });

  it('手動でAccept-Languageを指定 => 指定値が使用される', function (done) {
    var lang = 'en_US';
    cli.set('headers', {
      'Accept-Language': lang
    });
    cli.fetch(helper.url('~info'), function (err, $, res, body) {
      assert(res.headers['accept-language'] === lang);
      done();
    });
  });
});

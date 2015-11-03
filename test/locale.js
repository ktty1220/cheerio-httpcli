/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
var assert   = require('power-assert');
var helper   = require('./_helper');
var cli      = require('../index');

describe('locale', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  it('デフォルトは実行環境のロケールがセットされる', function (done) {
    cli.fetch(helper.url('~info'), function (err, $, res, body) {
      // This test will fail when executed outside Japan.
      assert(res.headers['accept-language'] === 'ja-JP,en-US');
      done();
    });
  });

  it('手動でAccept-Languageを指定した場合はそれが使用される', function (done) {
    var lang = 'en_US';
    cli.headers['Accept-Language'] = lang;
    cli.fetch(helper.url('~info'), function (err, $, res, body) {
      assert(res.headers['accept-language'] === lang);
      done();
    });
  });
});

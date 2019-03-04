/*eslint-env mocha*/
/*eslint no-invalid-this:0*/

var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('webpack', function () {
  before(function () {
    // Webpackでバンドルされている状態をエミュレート
    /*eslint-disable-next-line no-underscore-dangle*/
    global.__webpack_require__ = function () {};
  });
  after(function () {
    // Webpackエミュレートを解除
    /*eslint-disable-next-line no-underscore-dangle*/
    delete global.__webpack_require__;
  });

  it('iconvモジュールを変更しようとするとWARNINGメッセージが表示される', function (done) {
    helper.hookStderr(function (unhook) {
      assert(cli.iconv === 'iconv-lite');
      cli.set('iconv', 'iconv');
      var expected = '[WARNING] changing Iconv module have been disabled in this environment (eg Webpacked)';
      var actual = helper.stripMessageDetail(unhook());
      assert(actual === expected);
      assert(cli.iconv === 'iconv-lite');
      done();
    });
  });
  // xxxSync, os-localeについてはWebpackエミュレートだけでは再現できないので省略
});

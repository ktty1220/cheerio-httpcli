/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('iconv:load', function () {
  it('不正なiconvモジュール名 => 例外発生', function () {
    try {
      cli.set('iconv', 'iconvjp');
    } catch (e) {
      assert(e.message === 'Cannot find module "iconvjp"');
      return;
    }
    throw new Error('exception was not thrown');
  });
});

// This test will be failed when executed on below environment.
// - 'iconv' module is not installed
describe('iconv:iconv', function () {
  before(function () {
    try {
      cli.set('iconv', 'iconv');
    } catch (e) {
      this.skip();
      return;
    }
  });

  it('iconv-liteで未対応のページでもiconvを使用 => UTF-8に変換される(iso-2022-jp)', function (done) {
    cli.fetch(helper.url('error', 'iso-2022-jp'), function (err, $, res, body) {
      assert($.documentInfo().encoding === 'iso-2022-jp');
      assert($('title').text() === '夏目漱石「私の個人主義」');
      done();
    });
  });
});

describe('iconv:get', function () {
  [ 'iconv', 'iconv-lite' ].forEach(function (icmod) {
    describe('現在使用中のiconvモジュール名を返す', function () {
      it(icmod, function () {
        try {
          cli.set('iconv', icmod);
          assert(cli.iconv === icmod);
        } catch (e) {
          this.skip();
          return;
        }
      });
    });
  });
});

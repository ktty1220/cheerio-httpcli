/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('iconv:load', function () {
  it('不正なiconvモジュール名 => 例外発生', function () {
    try {
      cli.setIconvEngine('iconvjp');
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
    cli.setIconvEngine('iconv');
  });

  it('iconv-liteで未対応のページでもiconvを使用 => UTF-8に変換される(iso-2022-jp)', function (done) {
    cli.fetch(helper.url('error', 'iso-2022-jp'), function (err, $, res, body) {
      assert($.documentInfo().encoding === 'iso-2022-jp');
      assert($('title').text() === '夏目漱石「私の個人主義」');
      done();
    });
  });
});

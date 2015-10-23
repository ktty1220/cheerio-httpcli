/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('iconv:load', function () {
  it('不正なiconvモジュール名を指定すると例外が発生する', function () {
    try {
      cli.setIconvEngine('iconvjp');
    } catch (e) {
      assert(e.message === 'Cannot find module "iconvjp"');
      return;
    }
    throw new Error('exception was not thrown');
  });
});

describe('iconv:iconv', function () {
  before(function () {
    this.server = helper.server();
    cli.setIconvEngine('iconv');
  });
  after(function () {
    this.server.close();
  });

  it('iconv-liteで未対応のページでもiconvを使用するとUTF-8に変換される(iso-2022-jp)', function (done) {
    cli.fetch(helper.url('error', 'iso-2022-jp'), function (err, $, res, body) {
      assert($.documentInfo().encoding === 'iso-2022-jp');
      assert($('title').text() === '夏目漱石「私の個人主義」');
      done();
    });
  });
});

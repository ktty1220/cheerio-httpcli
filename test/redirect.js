/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
var assert = require('power-assert');
var type   = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('redirect', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  it('documentInfoにリダイレクト先のURLが登録される', function (done) {
    var url = helper.url('manual', 'euc-jp');
    cli.fetch(helper.url('~redirect'), function (err, $, res, body) {
      assert($.documentInfo().url === url);
      done();
    });
  });

  it('POST送信後にクッキーがセットされリダイレクト先に飛ぶ', function (done) {
    var server = this.server;
    server.resetTraceRoute();
    var url = helper.url('manual', 'euc-jp');
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=login]').submit(function (err, $, res, body) {
        assert(type(res.cookies) === 'object');
        assert(res.cookies.user === 'guest');
        assert($.documentInfo().url === url);
        assert.deepEqual(server.getTraceRoute(), [
          '/form/utf-8.html',
          '/~redirect',
          '/manual/euc-jp.html'
        ]);
        done();
      });
    });
  });

});

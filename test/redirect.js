/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var typeOf = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('redirect', function () {
  it('documentInfoにリダイレクト先のURLが登録される', function (done) {
    var url = helper.url('manual', 'euc-jp');
    cli.fetch(helper.url('~redirect'), function (err, $, res, body) {
      assert($.documentInfo().url === url);
      done();
    });
  });

  it('POST送信後にクッキーがセットされリダイレクト先に飛ぶ', function (done) {
    var url = helper.url('manual', 'euc-jp');
    cli.fetch(helper.url('form', 'utf-8') + '?reset_trace_route', function (err, $, res, body) {
      $('form[name=login]').submit(function (err, $, res, body) {
        assert(typeOf(res.cookies) === 'object');
        assert(res.cookies.user === 'guest');
        assert($.documentInfo().url === url);
        assert.deepEqual(JSON.parse(res.headers['trace-route']), [
          '/form/utf-8.html?reset_trace_route',
          '/~redirect',
          '/manual/euc-jp.html'
        ]);
        done();
      });
    });
  });

});

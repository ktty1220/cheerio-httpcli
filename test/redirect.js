/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var typeOf = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('redirect', function () {
  describe('30x', function () {
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

  describe('meta refresh', function () {
    beforeEach(function () {
      cli.followMetaRefresh = true;
    });

    it('meta[refresh]タグを検知してリダイレクト先に飛ぶ', function (done) {
      var url = helper.url('form', 'utf-8');
      cli.fetch(helper.url('refresh', 'all'), function (err, $, res, body) {
        assert($.documentInfo().url === url);
        done();
      });
    });

    it('followMetaRefreshがfalse => meta[refresh]タグがあってもリダイレクトしない', function (done) {
      cli.followMetaRefresh = false;
      var url = helper.url('refresh', 'all');
      cli.fetch(url, function (err, $, res, body) {
        assert($.documentInfo().url === url);
        done();
      });
    });

    it('IE条件コメント内のmeta[refresh]タグはリダイレクト対象外', function (done) {
      var url = helper.url('refresh', 'ie-only');
      cli.fetch(url, function (err, $, res, body) {
        assert($.documentInfo().url === url);
        assert($('title').text() === 'Refresh IE only');
        done();
      });
    });
  });
});

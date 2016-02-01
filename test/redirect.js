/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var typeOf = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('redirect', function () {
  describe('async', function () {
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

      it('meta[refresh]タグを検知してリダイレクト先に飛ぶ(絶対URL)', function (done) {
        var url = helper.url('refresh', 'absolute');
        cli.fetch(url, function (err, $, res, body) {
          assert($.documentInfo().url === helper.url('~info'));
          assert(res.headers.referer === url);
          done();
        });
      });

      it('meta[refresh]タグを検知してリダイレクト先に飛ぶ(相対URL)', function (done) {
        var url = helper.url('refresh', 'relative');
        cli.fetch(url, function (err, $, res, body) {
          assert($.documentInfo().url === helper.url('~info'));
          assert(res.headers.referer === url);
          done();
        });
      });

      it('followMetaRefresh:false => meta[refresh]タグがあってもリダイレクトしない', function (done) {
        cli.followMetaRefresh = false;
        var url = helper.url('refresh', 'absolute');
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

  describe('sync', function () {
    describe('30x', function () {
      it('documentInfoにリダイレクト先のURLが登録される', function () {
        var url = helper.url('manual', 'euc-jp');
        var result = cli.fetchSync(helper.url('~redirect'));
        assert(result.$.documentInfo().url === url);
      });

      it('POST送信後にクッキーがセットされリダイレクト先に飛ぶ', function (done) {
        var url = helper.url('manual', 'euc-jp');
        cli.fetch(helper.url('form', 'utf-8') + '?reset_trace_route', function (err, $, res, body) {
          var result = $('form[name=login]').submitSync();
          assert(typeOf(result.response.cookies) === 'object');
          assert(result.response.cookies.user === 'guest');
          assert(result.$.documentInfo().url === url);
          assert.deepEqual(JSON.parse(result.response.headers['trace-route']), [
            '/form/utf-8.html?reset_trace_route',
            '/~redirect',
            '/manual/euc-jp.html'
          ]);
          done();
        });
      });
    });

    describe('meta refresh', function () {
      beforeEach(function () {
        cli.followMetaRefresh = true;
      });

      it('meta[refresh]タグを検知してリダイレクト先に飛ぶ(絶対URL)', function () {
        var url = helper.url('refresh', 'absolute');
        var result = cli.fetchSync(url);
        assert(result.$.documentInfo().url === helper.url('~info'));
        assert(result.response.headers.referer === url);
      });

      it('meta[refresh]タグを検知してリダイレクト先に飛ぶ(相対URL)', function () {
        var url = helper.url('refresh', 'relative');
        var result = cli.fetchSync(url);
        assert(result.$.documentInfo().url === helper.url('~info'));
        assert(result.response.headers.referer === url);
      });

      it('followMetaRefresh:false => meta[refresh]タグがあってもリダイレクトしない', function () {
        cli.followMetaRefresh = false;
        var url = helper.url('refresh', 'absolute');
        var result = cli.fetchSync(url);
        assert(result.$.documentInfo().url === url);
      });

      it('IE条件コメント内のmeta[refresh]タグはリダイレクト対象外', function () {
        var url = helper.url('refresh', 'ie-only');
        var result = cli.fetchSync(url);
        assert(result.$.documentInfo().url === url);
        assert(result.$('title').text() === 'Refresh IE only');
      });
    });
  });
});

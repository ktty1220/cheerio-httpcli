/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('referer:enable', function () {
  it('Referer自動設定を有効 => リクエストの度にRefererがセットされる', function (done) {
    cli.referer = true;
    var url = helper.url('auto', 'euc-jp');
    cli.fetch(url, function (err, $, res, body) {
      cli.fetch(helper.url('~info'), function (err, $, res, body) {
        assert(res.headers.referer === url);
        url = helper.url('manual', 'utf-8(html5)');
        cli.fetch(url, function (err, $, res, body) {
          cli.fetch(helper.url('~info'), function (err, $, res, body) {
            assert(res.headers.referer === url);
            url = helper.url('~info');
            // エラーページはRefererにセットされない
            cli.fetch(helper.url('error', '~404'), function (err, $, res, body) {
              cli.fetch(helper.url('~info'), function (err, $, res, body) {
                assert(res.headers.referer === url);
                done();
              });
            });
          });
        });
      });
    });
  });
});

describe('referer:disable', function () {
  it('Referer自動設定を無効 => Refererはセットされない', function (done) {
    cli.referer = false;
    delete cli.headers.Referer;
    var url = helper.url('auto', 'euc-jp');
    cli.fetch(url, function (err, $, res, body) {
      cli.fetch(helper.url('~info'), function (err, $, res, body) {
        assert(! res.headers.referer);
        url = helper.url('manual', 'utf-8(html5)');
        cli.fetch(url, function (err, $, res, body) {
          cli.fetch(helper.url('~info'), function (err, $, res, body) {
            assert(! res.headers.referer);
            done();
          });
        });
      });
    });
  });
});

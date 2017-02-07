/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert   = require('power-assert');
var each     = require('foreach');
var helper   = require('./_helper');
var cli      = require('../index');
var browsers = require('../lib/browsers.json');

describe('browser', function () {
  it('デフォルトはChromeのUser-Agentがセットされる', function (done) {
    cli.fetch(helper.url('~info'), function (err, $, res, body) {
      assert(browsers.chrome === res.headers['user-agent']);
      done();
    });
  });

  each(browsers, function (ua, browser) {
    it('指定したブラウザのUAが反映されている(' + browser + ')', function (done) {
      cli.set('browser', browser);
      cli.fetch(helper.url('~info'), function (err, $, res, body) {
        assert(ua === res.headers['user-agent']);
        assert(cli.browser === browser);
        done();
      });
    });
  });

  it('対応していないブラウザ => User-Agentは変更されない', function (done) {
    cli.set('browser', 'ie');
    var now = cli.headers['user-agent'];
    helper.hookStderr(function (unhook) {
      cli.set('browser', 'w3m');
      var expected = '[WARNING] unknown browser: w3m';
      var actual = helper.stripMessageDetail(unhook());
      assert(actual === expected);
      cli.fetch(helper.url('~info'), function (err, $, res, body) {
        assert(now === res.headers['user-agent']);
        assert(cli.browser === 'ie');
        done();
      });
    });
  });

  it('手動でUser-Agentを設定 => ブラウザ種類: custom', function () {
    cli.set('headers', {
      'User-Agent': 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'
    });
    assert(cli.browser === 'custom');
  });

  it('User-Agent未設定 => ブラウザ種類: null', function () {
    cli.set('headers', {
      'User-Agent': null
    });
    assert(cli.browser === null);
  });
});

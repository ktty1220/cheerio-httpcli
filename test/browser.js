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
      assert(cli.setBrowser(browser));
      cli.fetch(helper.url('~info'), function (err, $, res, body) {
        assert(ua === res.headers['user-agent']);
        done();
      });
    });
  });

  it('対応していないブラウザ => User-Agentは変更されない', function (done) {
    var now = cli.headers['User-Agent'];
    assert(! cli.setBrowser('w3m'));
    cli.fetch(helper.url('~info'), function (err, $, res, body) {
      assert(now === res.headers['user-agent']);
      done();
    });
  });
});

/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
var assert   = require('power-assert');
var helper   = require('./_helper');
var cli      = require('../index');
var browsers = require('../lib/browsers.json');

describe('browser', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  it('デフォルトはChromeのUser-Agentがセットされる', function (done) {
    cli.fetch(helper.url('~info'), function (err, $, res, body) {
      assert(browsers.chrome === res.headers['user-agent']);
      done();
    });
  });

  Object.keys(browsers).forEach(function (b) {
    it('指定したブラウザのUAが反映されている(' + b + ')', function (done) {
      assert(cli.setBrowser(b));
      cli.fetch(helper.url('~info'), function (err, $, res, body) {
        assert(browsers[b] === res.headers['user-agent']);
        done();
      });
    });
  });

  it('対応していないブラウザを指定してもUser-Agentは変更されない', function (done) {
    var now = cli.headers['User-Agent'];
    assert(! cli.setBrowser('w3m'));
    cli.fetch(helper.url('~info'), function (err, $, res, body) {
      assert(now === res.headers['user-agent']);
      done();
    });
  });
});

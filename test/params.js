/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
var assert = require('power-assert');
var type   = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('params', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  it('パラメータの指定がURLに反映されている', function (done) {
    var param = { hoge: 'fuga', piyo: 999, doya: true };
    cli.fetch(helper.url('~info'), param, function (err, $, res, body) {
      assert(res.headers['request-url'] === '/~info?hoge=fuga&piyo=999&doya=true');
      done();
    });
  });

  it('クッキーがセットされている', function (done) {
    cli.fetch(helper.url('~info'), function (err, $, res, body) {
      assert(type(res.cookies) === 'object');
      assert(res.cookies.session_id === 'hahahaha');
      assert(res.cookies.login === '1');
      done();
    });
  });
});

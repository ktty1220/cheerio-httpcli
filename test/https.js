/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert    = require('power-assert');
var typeOf    = require('type-of');
var constants = require('constants');
var helper    = require('./_helper');
var cli       = require('../index');

// オレオレ証明書のサーバーにアクセスできるようにする
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

describe('https', function () {
  it('agentOptions未設定 => TLS1.2 Onlyのサーバーに接続可能', function (done) {
    cli.fetch(helper.url('%https%'), function (err, $, res, body) {
      assert(! err);
      assert(typeOf(res) === 'object');
      assert(typeOf($) === 'function');
      assert(typeOf(body) === 'string');
      assert(body === 'hello, https');
      done();
    });
  });

  it('agentOptions: TLS1.2強制 => TLS1.2 Onlyのサーバーに接続可能', function (done) {
    cli.set('agentOptions', {
      secureProtocol: 'TLSv1_2_method'
    });
    cli.fetch(helper.url('%https%'), function (err, $, res, body) {
      assert(! err);
      assert(typeOf(res) === 'object');
      assert(typeOf($) === 'function');
      assert(typeOf(body) === 'string');
      assert(body === 'hello, https');
      done();
    });
  });

  it('agentOptions: TLS1.2強制 => httpのサーバーにも接続可能', function (done) {
    cli.set('agentOptions', {
      secureProtocol: 'TLSv1_2_method'
    });
    cli.fetch(helper.url('~info'), function (err, $, res, body) {
      assert(! err);
      assert(typeOf(res) === 'object');
      assert(typeOf($) === 'function');
      assert(typeOf(body) === 'string');
      done();
    });
  });

  it('agentOptions: TLS1.1強制 => TLS1.2 Onlyのサーバーに接続不可', function (done) {
    cli.set('agentOptions', {
      secureProtocol: 'TLSv1_1_method'
    });
    var url = helper.url('%https%');
    cli.fetch(url, function (err, $, res, body) {
      assert(err.errno === 'EPROTO');
      assert(err.code === 'EPROTO');
      assert(err.message.indexOf('handshake failure:') !== -1);
      assert(err.url === url);
      assert(! res);
      assert(! $);
      assert(! body);
      done();
    });
  });

  it('agentOptions: TLS1.2無効 => TLS1.2 Onlyのサーバーに接続不可', function (done) {
    cli.set('agentOptions', {
      secureOptions: constants.SSL_OP_NO_TLSv1_2
    });
    var url = helper.url('%https%');
    cli.fetch(url, function (err, $, res, body) {
      assert(err.errno === 'EPROTO');
      assert(err.code === 'EPROTO');
      assert(err.message.indexOf('handshake failure:') !== -1);
      assert(err.url === url);
      assert(! res);
      assert(! $);
      assert(! body);
      done();
    });
  });
});

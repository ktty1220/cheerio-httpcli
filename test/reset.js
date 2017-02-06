/*eslint-env mocha*/
/*jshint -W100*/
var assert = require('power-assert');
var typeOf = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('reset', function () {
  it('パラメータ変更 => reset => 各パラメータが初期化される', function () {
    cli.set('browser', 'googlebot');
    cli.set('timeout', 9999);
    cli.set('gzip', false);
    cli.set('referer', false);
    cli.set('followMetaRefresh', true);
    cli.set('maxDataSize', 9999);
    cli.set('debug', true);

    cli.reset();

    assert.deepEqual(cli.headers, {});
    assert(cli.timeout === 30000);
    assert(cli.gzip === true);
    assert(cli.referer === true);
    assert(cli.followMetaRefresh === false);
    assert(cli.maxDataSize === null);
    assert(cli.debug === false);
  });

  it('アクセス => アクセス => クッキーが保持される', function () {
    var url = helper.url('~session');
    var sid = null;
    return cli.fetch(url)
    .then(function (result) {
      sid = result.response.cookies.x_session_id;
      assert(typeOf(sid) === 'string');
      assert(/user_[0-9a-z]{32}$/i.test(sid));
      return cli.fetch(url);
    })
    .then(function (result) {
      assert(sid === result.response.cookies.x_session_id);
    });
  });

  it('アクセス => reset => アクセス => クッキーが破棄される', function () {
    var url = helper.url('~session');
    var sid = null;
    return cli.fetch(url)
    .then(function (result) {
      sid = result.response.cookies.x_session_id;
      assert(typeOf(sid) === 'string');
      assert(/user_[0-9a-z]{32}$/i.test(sid));
      cli.reset();
      return cli.fetch(url);
    })
    .then(function (result) {
      var newSid = result.response.cookies.x_session_id;
      assert(typeOf(newSid) === 'string');
      assert(/user_[0-9a-z]{32}$/i.test(newSid));
      assert(sid !== newSid);
    });
  });
});

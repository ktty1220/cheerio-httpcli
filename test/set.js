/*eslint-env mocha*/
/*jshint -W100*/
var assert = require('power-assert');
var each   = require('foreach');
var helper = require('./_helper');
var cli    = require('../index');

describe('set', function () {
  it('存在しないプロパティ => エラー', function () {
    try {
      cli.set('hoge');
      throw new Error('not thrown');
    } catch (e) {
      assert(e.message === 'no such property "hoge"');
    }
  });

  it('存在するプロパティ(プリミティブ型) => プロパティが更新される', function () {
    cli.set('timeout', 8888);
    assert(cli.timeout === 8888);
  });

  it('存在するプロパティ(プリミティブ型) + nomerge => プロパティが更新される', function () {
    cli.set('gzip', false);
    assert(cli.gzip === false);
  });

  it('存在するプロパティ(オブジェクト) => 指定したキーのみ更新される', function () {
    cli.set('headers', {
      'accept-language': 'en-US',
      referer: 'http://hoge.com/'
    }, true);
    cli.set('headers', {
      'Accept-Language': 'ja'
    });
    assert.deepEqual(cli.headers, {
      'accept-language': 'ja',
      referer: 'http://hoge.com/'
    });
  });

  it('存在するプロパティ(オブジェクト) => 値をnullにすると削除される', function () {
    cli.set('headers', {
      'accept-language': 'en-US',
      referer: 'http://hoge.com/'
    }, true);
    cli.set('headers', {
      'Accept-Language': null
    });
    assert.deepEqual(cli.headers, {
      referer: 'http://hoge.com/'
    });
  });

  it('存在するプロパティ(オブジェクト) + nomerge => プロパティそのものが上書きされる', function () {
    cli.set('headers', {
      'accept-language': 'en-US',
      referer: 'http://hoge.com/'
    }, true);
    cli.set('headers', {
      'Accept-Language': 'ja'
    }, true);
    assert.deepEqual(cli.headers, {
      'accept-language': 'ja'
    });
  });

  it('直接値を更新 => 更新できるがDEPRECATEDメッセージが表示される', function () {
    cli.set('timeout', 7777);
    helper.hookStderr(function (unhook) {
      cli.timeout = 3333;
      var expected = '[DEPRECATED] direct property update will be refused in the future. use set(key, value)';
      var actual = helper.stripMessageDetail(unhook());
      assert(actual === expected);
      assert(cli.timeout === 3333);
    });
  });

  describe('型チェック', function () {
    var types = {
      headers: {
        ok: [{}], ng: [ 1, true, 'str', null ],
        type: 'object'
      },
      timeout: {
        ok: [ 0, 100 ],
        ng: [ -1, false, 'str', {}, [], null ],
        type: 'number'
      },
      gzip: {
        ok: [ true, false ],
        ng: [ 1, 'str', {}, [], null ],
        type: 'boolean'
      },
      referer: {
        ok: [ true, false ],
        ng: [ 1, 'str', {}, [], null ],
        type: 'boolean'
      },
      followMetaRefresh: {
        ok: [ true, false ],
        ng: [ 1, 'str', {}, [], null ],
        type: 'boolean'
      },
      maxDataSize: {
        ok: [ 0, 100, null ],
        ng: [ -1, false, 'str', {}, [] ],
        type: 'number or null'
      },
      forceHtml: {
        ok: [ true, false ],
        ng: [ 1, 'str', {}, [], null ],
        type: 'boolean'
      },
      debug: {
        ok: [ true, false ],
        ng: [ 1, 'str', {}, [], null ],
        type: 'boolean'
      }
    };
    /*eslint-disable max-nested-callbacks*/
    each(types, function (values, name) {
      describe(name, function () {
        it('OK', function () {
          each(values.ok, function (v) {
            helper.hookStderr(function (unhook) {
              cli.set(name, v);
              var expected = '';
              var actual = unhook();
              assert(actual === expected);
            });
          });
        });
        it('NG', function () {
          each(values.ng, function (v) {
            helper.hookStderr(function (unhook) {
              cli.set(name, v);
              var expected = '[WARNING] invalid value: ' + String(v) + '. '
              + 'property "' + name + '" can accept only ' + values.type;
              var actual = helper.stripMessageDetail(unhook());
              assert(actual === expected);
            });
          });
        });
      });
    });
    /*eslint-enable max-nested-callbacks*/
  });
});

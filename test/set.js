/*eslint-env mocha*/
/*jshint -W100*/
var assert = require('power-assert');
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
    cli.headers = {
      'Accept-Language': 'en-US',
      Referer: 'http://hoge.com/'
    };
    cli.set('headers', {
      'Accept-Language': 'ja'
    });
    assert.deepEqual(cli.headers, {
      'Accept-Language': 'ja',
      Referer: 'http://hoge.com/'
    });
  });

  it('存在するプロパティ(オブジェクト) + nomerge => プロパティそのものが上書きされる', function () {
    cli.headers = {
      'Accept-Language': 'en-US',
      Referer: 'http://hoge.com/'
    };
    cli.set('headers', {
      'Accept-Language': 'ja'
    }, true);
    assert.deepEqual(cli.headers, {
      'Accept-Language': 'ja'
    });
  });
});

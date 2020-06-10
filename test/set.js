const each = require('foreach');
const helper = require('./_helper');
const cli = require('../index');

describe('set', () => {
  let spy = null;
  beforeEach(() => {
    spy = jest.spyOn(console, 'warn');
    spy.mockImplementation((x) => x);
  });
  afterEach(() => {
    spy.mockReset();
    spy.mockRestore();
  });

  test('存在しないプロパティ => エラー', () => {
    expect(() => cli.set('hoge')).toThrow('no such property "hoge"');
  });

  test('存在するプロパティ(プリミティブ型) => プロパティが更新される', () => {
    cli.set('timeout', 8888);
    expect(cli.timeout).toStrictEqual(8888);
  });

  test('存在するプロパティ(プリミティブ型) + nomerge => プロパティが更新される', () => {
    cli.set('gzip', false);
    expect(cli.gzip).toStrictEqual(false);
  });

  test('存在するプロパティ(オブジェクト) => 指定したキーのみ更新される', () => {
    cli.set(
      'headers',
      {
        'accept-language': 'en-US',
        referer: 'http://hoge.com/'
      },
      true
    );
    cli.set('headers', {
      'Accept-Language': 'ja'
    });
    expect(cli.headers).toStrictEqual({
      'accept-language': 'ja',
      referer: 'http://hoge.com/'
    });
  });

  test('存在するプロパティ(オブジェクト) => 値をnullにすると削除される', () => {
    cli.set(
      'headers',
      {
        'accept-language': 'en-US',
        referer: 'http://hoge.com/'
      },
      true
    );
    cli.set('headers', {
      'Accept-Language': null
    });
    expect(cli.headers).toStrictEqual({
      referer: 'http://hoge.com/'
    });
  });

  test('存在するプロパティ(オブジェクト) + nomerge => プロパティそのものが上書きされる', () => {
    cli.set(
      'headers',
      {
        'accept-language': 'en-US',
        referer: 'http://hoge.com/'
      },
      true
    );
    cli.set(
      'headers',
      {
        'Accept-Language': 'ja'
      },
      true
    );
    expect(cli.headers).toStrictEqual({
      'accept-language': 'ja'
    });
  });

  test('直接値を更新 => 更新できるがDEPRECATEDメッセージが表示される', () => {
    cli.set('timeout', 7777);
    cli.timeout = 3333;
    expect(spy).toHaveBeenCalledTimes(1);
    const actual = helper.stripMessageDetail(spy.mock.calls[0][0]);
    expect(actual).toStrictEqual(
      '[DEPRECATED] direct property update will be refused in the future. use set(key, value)'
    );
    expect(cli.timeout).toStrictEqual(3333);
  });

  describe('型チェック', () => {
    const types = {
      headers: {
        ok: [{}],
        ng: [1, true, 'str', null],
        type: 'object'
      },
      timeout: {
        ok: [0, 100],
        ng: [-1, false, 'str', {}, [], null],
        type: 'number'
      },
      gzip: {
        ok: [true, false],
        ng: [1, 'str', {}, [], null],
        type: 'boolean'
      },
      referer: {
        ok: [true, false],
        ng: [1, 'str', {}, [], null],
        type: 'boolean'
      },
      followMetaRefresh: {
        ok: [true, false],
        ng: [1, 'str', {}, [], null],
        type: 'boolean'
      },
      maxDataSize: {
        ok: [0, 100, null],
        ng: [-1, false, 'str', {}, []],
        type: 'number or null'
      },
      forceHtml: {
        ok: [true, false],
        ng: [1, 'str', {}, [], null],
        type: 'boolean'
      },
      debug: {
        ok: [true, false],
        ng: [1, 'str', {}, [], null],
        type: 'boolean'
      }
    };
    each(types, (values, name) => {
      describe(name, () => {
        each(values.ok, (v) => {
          test(`${String(v)}: OK`, () => {
            cli.set(name, v);
            expect(spy).toHaveBeenCalledTimes(0);
          });
        });
        each(values.ng, (v) => {
          test(`${String(v)}: NG`, () => {
            cli.set(name, v);
            expect(spy).toHaveBeenCalledTimes(1);
            const actual = helper.stripMessageDetail(spy.mock.calls[0][0]);
            expect(actual).toStrictEqual(
              `[WARNING] invalid value: ${String(v)}. property "${name}" can accept only ${
                values.type
              }`
            );
          });
        });
      });
    });
  });
});

const helper = require('./_helper');
const cli = require('../index');

describe('webpack', () => {
  beforeAll(() => {
    cli.set('iconv', 'iconv-lite');
    // Webpackでバンドルされている状態をエミュレート
    global.__webpack_require__ = () => {};
  });
  afterAll(() => {
    // Webpackエミュレートを解除
    delete global.__webpack_require__;
  });

  let spy = null;
  beforeEach(() => {
    spy = jest.spyOn(console, 'warn');
    spy.mockImplementation((x) => x);
  });
  afterEach(() => {
    spy.mockReset();
    spy.mockRestore();
  });

  test('iconvモジュールを変更しようとするとWARNINGメッセージが表示される', () => {
    cli.set('iconv', 'iconv');
    expect(spy).toHaveBeenCalledTimes(1);
    const actual = helper.stripMessageDetail(spy.mock.calls[0][0]);
    expect(actual).toStrictEqual(
      '[WARNING] changing Iconv module have been disabled in this environment (eg Webpacked)'
    );
    expect(cli.iconv).toStrictEqual('iconv-lite');
  });
  // xxxSync, os-localeについてはWebpackエミュレートだけでは再現できないので省略
});

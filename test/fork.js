const helper = require('./_helper');
const cli = require('../index');
const browsers = require('../lib/browsers.json');
const endpoint = helper.endpoint();
const sesUrl = `${endpoint}/~session`;

describe('fork', () => {
  afterEach(() => {
    cli.reset();
  });

  test('子インスタンスはfork/download/versionを持っていない', () => {
    const child = cli.fork();
    expect(child).not.toHaveProperty('download');
    expect(child).not.toHaveProperty('version');
    expect(child.fork).toBeUndefined();
  });

  test('親インスタンスの設定状況が引き継がれている', () => {
    cli.set('browser', 'googlebot');
    cli.set('headers', { 'X-Requested-With': 'XMLHttpRequest' });
    cli.set('timeout', 9999);
    cli.set('gzip', false);
    cli.set('referer', false);
    cli.set('followMetaRefresh', true);
    cli.set('maxDataSize', 9999);
    cli.set('debug', true);
    const child = cli.fork();
    Object.keys(child).forEach((prop) => {
      expect(child[prop]).toStrictEqual(cli[prop]);
    });
  });

  test('親インスタンスのクッキーが引き継がれている', async () => {
    const r1 = await cli.fetch(sesUrl);
    const expected = cli.exportCookies();
    const child = cli.fork();
    const actual = child.exportCookies();
    expect(actual).toStrictEqual(expected);
    const r2 = await child.fetch(sesUrl);
    expect(r1.response.cookies).toStrictEqual(r2.response.cookies);
  });

  test('fork後の親と子の設定やクッキーは同期しない', () => {
    return new Promise((resolve) => {
      cli.set('browser', 'ie');
      cli.set('referer', false);
      cli.fetch(sesUrl, (err, $, res, body) => {
        const expected = JSON.stringify(cli._cookieJar);
        const child = cli.fork();
        child.reset();
        const actual = JSON.stringify(child._cookieJar);
        expect(actual).not.toStrictEqual(expected);
        expect(cli.browser).toStrictEqual('ie');
        expect(child.browser).toStrictEqual(null);
        expect(cli.referer).toStrictEqual(false);
        expect(child.referer).toStrictEqual(true);
        resolve();
      });
    });
  });

  test('子インスタンスでリクエスト => 子インスタンスの設定が使用される', () => {
    return new Promise((resolve) => {
      const child = cli.fork();
      child.set('browser', 'ie');
      child.set('referer', false);
      child.set('headers', { 'X-Requested-With': 'XMLHttpRequest' });
      child.fetch(`${endpoint}/~info`, (err, $, res, body) => {
        expect(res.headers['user-agent']).toStrictEqual(browsers.ie);
        expect(child.browser).toStrictEqual('ie');
        expect(child.referer).toStrictEqual(false);
        resolve();
      });
    });
  });

  test('親と子は別々のクッキーを保持する', async () => {
    const child1 = cli.fork();
    const child2 = cli.fork();
    const cookies = {};
    const r1a = await cli.fetch(sesUrl);
    cookies.r1a = r1a.response.cookies;
    const r1b = await cli.fetch(sesUrl);
    cookies.r1b = r1b.response.cookies;
    const r2a = await child1.fetch(sesUrl);
    cookies.r2a = r2a.response.cookies;
    const r2b = await child1.fetch(sesUrl);
    cookies.r2b = r2b.response.cookies;
    const r3a = await child2.fetch(sesUrl);
    cookies.r3a = r3a.response.cookies;
    const r3b = await child2.fetch(sesUrl);
    cookies.r3b = r3b.response.cookies;
    expect(cookies.r1a).toStrictEqual(cookies.r1b);
    expect(cookies.r2a).toStrictEqual(cookies.r2b);
    expect(cookies.r3a).toStrictEqual(cookies.r3b);
    expect(cookies.r1a).not.toStrictEqual(cookies.r2a);
    expect(cookies.r2a).not.toStrictEqual(cookies.r3a);
  });

  test('非同期リクエスト => 同期リクエスト => クッキーが保持される', () => {
    const child = cli.fork();
    return child.fetch(sesUrl).then((r1) => {
      const expected = r1.response.cookies;
      const r2 = child.fetchSync(sesUrl);
      const actual = r2.response.cookies;
      expect(actual).toStrictEqual(expected);
      expect(Object.keys(actual).length).toBeGreaterThan(0);
    });
  });

  test('同期リクエスト => 非同期リクエスト => クッキーが保持される', () => {
    const child = cli.fork();
    const r1 = child.fetchSync(sesUrl);
    const expected = r1.response.cookies;
    return child.fetch(sesUrl).then((r2) => {
      const actual = r2.response.cookies;
      expect(actual).toStrictEqual(expected);
      expect(Object.keys(actual).length).toBeGreaterThan(0);
    });
  });

  test('同期リクエスト => 同期リクエスト => クッキーが保持される', () => {
    const child = cli.fork();
    const r1 = child.fetchSync(sesUrl);
    const expected = r1.response.cookies;
    const r2 = child.fetchSync(sesUrl);
    const actual = r2.response.cookies;
    expect(actual).toStrictEqual(expected);
    expect(Object.keys(actual).length).toBeGreaterThan(0);
  });
});

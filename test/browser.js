const each = require('foreach');
const helper = require('./_helper');
const cli = require('../index');
const browsers = require('../lib/browsers.json');
const endpoint = helper.endpoint();

describe('browser', () => {
  test('デフォルトはChromeのUser-Agentがセットされる', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/~info`, (err, $, res, body) => {
        expect(res.headers['user-agent']).toStrictEqual(browsers.chrome);
        resolve();
      });
    });
  });

  each(browsers, (ua, browser) => {
    test(`指定したブラウザのUAが反映されている(${browser})`, () => {
      return new Promise((resolve) => {
        cli.set('browser', browser);
        cli.fetch(`${endpoint}/~info`, (err, $, res, body) => {
          expect(res.headers['user-agent']).toStrictEqual(ua);
          expect(cli.browser).toStrictEqual(browser);
          resolve();
        });
      });
    });
  });

  test('対応していないブラウザ => User-Agentは変更されない', () => {
    return new Promise((resolve) => {
      cli.set('browser', 'ie');
      const now = cli.headers['user-agent'];
      const spy = jest.spyOn(console, 'warn');
      spy.mockImplementation((x) => x);
      cli.set('browser', 'w3m');
      expect(spy).toHaveBeenCalledTimes(1);
      const actual = helper.stripMessageDetail(spy.mock.calls[0][0]);
      expect(actual).toStrictEqual('[WARNING] unknown browser: w3m');
      cli.fetch(`${endpoint}/~info`, (err, $, res, body) => {
        expect(res.headers['user-agent']).toStrictEqual(now);
        expect(cli.browser).toStrictEqual('ie');
        spy.mockReset();
        spy.mockRestore();
        resolve();
      });
    });
  });

  test('手動でUser-Agentを設定 => ブラウザ種類: custom', () => {
    cli.set('headers', {
      'User-Agent': 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'
    });
    expect(cli.browser).toStrictEqual('custom');
  });

  test('User-Agent未設定 => ブラウザ種類: null', () => {
    cli.set('headers', {
      'User-Agent': null
    });
    expect(cli.browser).toBeNull();
  });
});

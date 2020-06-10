const helper = require('./_helper');
const cli = require('../index');
const each = require('foreach');
const endpoint = helper.endpoint();

describe('cookie', () => {
  describe('基本動作', () => {
    beforeEach(() => {
      cli.reset();
    });

    test('エクスポート', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/~session`, (err, $, res, body) => {
          const actual = cli.exportCookies();
          expect(actual).toHaveLength(1);
          const cookie = actual[0];
          expect(cookie.name).toStrictEqual('x_session_id');
          expect(cookie.value).toMatch(/^user_([0-9a-z]{4,}-){4}([0-9a-z]{4,})$/i);
          expect(cookie.domain).toStrictEqual('localhost');
          resolve();
        });
      });
    });

    test('一旦空にしてインポート => クッキー内容が復元される', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/~session`, (err, $, res, body) => {
          const expected = cli.exportCookies();
          expect(expected).toHaveLength(1);
          cli.reset();
          expect(cli.exportCookies()).toHaveLength(0);
          cli.importCookies(expected);
          expect(cli.exportCookies()).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('インポート => 現在のクッキー内容は破棄される', async () => {
      await cli.fetch(`${endpoint}/~session`);
      const expected = cli.exportCookies();
      cli.reset();
      await cli.fetch(`${endpoint}/~session`);
      expect(cli.exportCookies()).not.toStrictEqual(expected);
      cli.importCookies(expected);
      expect(cli.exportCookies()).toStrictEqual(expected);
    });

    test('クッキー追加 => エクスポート => 追加分が反映されている', async () => {
      cli.reset();
      await cli.fetch(`${endpoint}/~session`);
      const before = cli.exportCookies();
      expect(before).toHaveLength(1);
      await cli.fetch(`${endpoint}/~info`);
      const after = cli.exportCookies();
      expect(after[0].name).toStrictEqual(before[0].name);
      expect(after[0].value).toStrictEqual(before[0].value);
      expect(after).toHaveLength(3);
      expect(after[1].name).toStrictEqual('session_id');
      expect(after[2].name).toStrictEqual('login');
    });
  });

  describe('インポート/エクスポート時の値の加工', () => {
    const src = [
      {
        // https, SameSite=lax
        name: '_foo',
        value: 'Ipsum possimus nesciunt ut ad illum Nemo voluptatibus vel itaque',
        domain: '.example.com',
        path: '/',
        expires: 1654419012,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax'
      },
      {
        // valueなし, wwwサブドメイン, path指定, expires=-1, SameSite=Strict
        name: '_bar',
        value: '',
        domain: 'www.example.com',
        path: '/nyoro/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Strict'
      },
      {
        // wwwサブドメイン, サブサブドメイン可, expires詳細切り捨て対象
        name: '_baz',
        value: 'xxx%20yyy%20zzz',
        domain: '.www.example.com',
        path: '/',
        expires: 1613347847.352102,
        httpOnly: false,
        secure: false
      }
    ];

    beforeAll(() => {
      cli.importCookies(src);
    });

    test('インポート => puppeteer形式からtough-cookie形式に変換されている', () => {
      const expected = [
        {
          key: '_foo',
          value: 'Ipsum possimus nesciunt ut ad illum Nemo voluptatibus vel itaque',
          domain: 'example.com',
          path: '/',
          expires: '2022-06-05T08:50:12.000Z',
          httpOnly: true,
          hostOnly: false,
          extensions: ['SameSite=lax'],
          secure: true
        },
        {
          key: '_bar',
          domain: 'www.example.com',
          path: '/nyoro/',
          hostOnly: true,
          extensions: ['SameSite=strict']
        },
        {
          key: '_baz',
          value: 'xxx%20yyy%20zzz',
          domain: 'www.example.com',
          path: '/',
          expires: '2021-02-15T00:10:47.352Z',
          hostOnly: false,
          extensions: ['SameSite=none']
        }
      ];
      const actual = JSON.parse(JSON.stringify(cli._cookieJar._jar)).cookies.map((cookie) => {
        // 以下の日時項目は動的に作られるものなので比較対象外とする
        delete cookie.creation;
        delete cookie.lastAccessed;
        return cookie;
      });
      expect(actual).toStrictEqual(expected);
    });

    describe('指定したURLに該当するクッキー抽出', () => {
      each(
        [
          ['ドメイン該当なし', 'http://www.foobarbaz.com/', []],
          ['http接続でpath指定なし', 'http://www.example.com/', ['_baz']],
          ['https接続でpath指定なし', 'https://www.example.com/', ['_baz', '_foo']],
          ['http接続でサブサブドメイン指定', 'http://x1.www.example.com/', ['_baz']],
          ['http接続でpath指定あり', 'http://www.example.com/nyoro/', ['_bar', '_baz']],
          ['https接続でpath指定あり', 'https://www.example.com/nyoro/', ['_bar', '_baz', '_foo']],
          ['https接続でサブサブドメイン指定', 'https://x1.www.example.com/', ['_baz', '_foo']]
        ],
        ([spec, url, expected]) => {
          test(`${url} => ${spec}`, () => {
            const actual = cli._cookieJar
              .getCookies(url)
              .map((c) => c.key)
              .sort();
            expect(actual).toStrictEqual(expected);
          });
        }
      );
    });

    test('エクスポート => tough-cookie形式からpuppeteer形式に変換されている', () => {
      const expected = src.map((cookie) => {
        const clone = { ...cookie };
        // tough-cookieでは小数3桁以降は切り捨てられるので復元できない
        clone.expires = Math.floor(clone.expires * 1000) / 1000;
        return clone;
      });
      const actual = cli.exportCookies();
      expect(actual).toStrictEqual(expected);
    });
  });
});

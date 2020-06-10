const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('locale', () => {
  test('デフォルトは実行環境のロケールがセットされる', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/~info`, (err, $, res, body) => {
        // This test will be failed when executed on below environment.
        // - System language is not ja-JP
        // - Windows and Node.js v0.10 or lower
        expect(res.headers['accept-language']).toStrictEqual('ja-JP,en-US');
        resolve();
      });
    });
  });

  test('手動でAccept-Languageを指定 => 指定値が使用される', () => {
    return new Promise((resolve) => {
      const lang = 'en_US';
      cli.set('headers', {
        'Accept-Language': lang
      });
      cli.fetch(`${endpoint}/~info`, (err, $, res, body) => {
        expect(res.headers['accept-language']).toStrictEqual(lang);
        resolve();
      });
    });
  });
});

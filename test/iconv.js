const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('iconv:load', () => {
  test('不正なiconvモジュール名 => 例外発生', () => {
    expect(() => cli.set('iconv', 'iconvjp')).toThrow('Cannot find module "iconvjp"');
  });
});

// This test will be failed when executed on below environment.
// - 'iconv' module is not installed
describe('iconv:iconv', () => {
  const t = (() => {
    try {
      cli.set('iconv', 'iconv');
      return test;
    } catch (e) {
      return xtest;
    }
  })();

  t('iconv-liteで未対応のページでもiconvを使用 => UTF-8に変換される(iso-2022-jp)', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/error/iso-2022-jp.html`, (err, $, res, body) => {
        expect($.documentInfo().encoding).toStrictEqual('iso-2022-jp');
        expect($('title').text()).toStrictEqual('夏目漱石「私の個人主義」');
        resolve();
      });
    });
  });
});

describe('iconv:get', () => {
  ['iconv', 'iconv-lite'].forEach((icmod) => {
    describe('現在使用中のiconvモジュール名を返す', () => {
      test(icmod, () => {
        try {
          cli.set('iconv', icmod);
          expect(cli.iconv).toStrictEqual(icmod);
        } catch (e) {}
      });
    });
  });
});

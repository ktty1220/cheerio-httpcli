const typeOf = require('type-of');
const uuid = require('uuid-random');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('redirect', () => {
  beforeEach(() => {
    cli.set(
      'headers',
      {
        'redirect-id': uuid()
      },
      true
    );
  });
  afterEach(() => {
    cli.set('headers', {}, true);
  });

  describe('async', () => {
    describe('30x', () => {
      test('documentInfoにリダイレクト先のURLが登録される', () => {
        return new Promise((resolve) => {
          const url = `${endpoint}/manual/euc-jp.html`;
          cli.fetch(`${endpoint}/~redirect`, (err, $, res, body) => {
            expect($.documentInfo().url).toStrictEqual(url);
            resolve();
          });
        });
      });

      test('POST送信後にクッキーがセットされリダイレクト先に飛ぶ(絶対パス)', () => {
        return new Promise((resolve) => {
          const url = `${endpoint}/manual/euc-jp.html`;
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            $('form[name=login]').submit((err, $, res, body) => {
              expect(typeOf(res.cookies)).toStrictEqual('object');
              expect(res.cookies.user).toStrictEqual('guest');
              expect($.documentInfo().url).toStrictEqual(url);
              expect(JSON.parse(res.headers['redirect-history'])).toStrictEqual([
                '/form/utf-8.html',
                '/~redirect',
                '/manual/euc-jp.html'
              ]);
              resolve();
            });
          });
        });
      });

      test('POST送信後にクッキーがセットされリダイレクト先に飛ぶ(相対パス)', () => {
        return new Promise((resolve) => {
          const url = `${endpoint}/manual/euc-jp.html`;
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            $('form[name=login]')
              .attr('action', '/~redirect_relative')
              .submit((err, $, res, body) => {
                expect(typeOf(res.cookies)).toStrictEqual('object');
                expect(res.cookies.user).toStrictEqual('guest');
                expect($.documentInfo().url).toStrictEqual(url);
                expect(JSON.parse(res.headers['redirect-history'])).toStrictEqual([
                  '/form/utf-8.html',
                  '/~redirect_relative',
                  '/manual/euc-jp.html'
                ]);
                resolve();
              });
          });
        });
      });
    });

    describe('meta refresh', () => {
      beforeEach(() => {
        cli.set('followMetaRefresh', true);
      });

      test('meta[refresh]タグを検知してリダイレクト先に飛ぶ(絶対URL)', () => {
        return new Promise((resolve) => {
          const url = `${endpoint}/refresh/absolute.html`;
          cli.fetch(url, (err, $, res, body) => {
            expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
            expect(res.headers.referer).toStrictEqual(url);
            resolve();
          });
        });
      });

      test('meta[refresh]タグを検知してリダイレクト先に飛ぶ(相対URL)', () => {
        return new Promise((resolve) => {
          const url = `${endpoint}/refresh/relative.html`;
          cli.fetch(url, (err, $, res, body) => {
            expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
            expect(res.headers.referer).toStrictEqual(url);
            resolve();
          });
        });
      });

      test('followMetaRefresh:false => meta[refresh]タグがあってもリダイレクトしない', () => {
        return new Promise((resolve) => {
          cli.set('followMetaRefresh', false);
          const url = `${endpoint}/refresh/absolute.html`;
          cli.fetch(url, (err, $, res, body) => {
            expect($.documentInfo().url).toStrictEqual(url);
            resolve();
          });
        });
      });

      test('IE条件コメント内のmeta[refresh]タグはリダイレクト対象外', () => {
        return new Promise((resolve) => {
          const url = `${endpoint}/refresh/ie-only.html`;
          cli.fetch(url, (err, $, res, body) => {
            expect($.documentInfo().url).toStrictEqual(url);
            expect($('title').text()).toStrictEqual('Refresh IE only');
            resolve();
          });
        });
      });
    });
  });

  describe('sync', () => {
    describe('30x', () => {
      test('documentInfoにリダイレクト先のURLが登録される', () => {
        const url = `${endpoint}/manual/euc-jp.html`;
        const result = cli.fetchSync(`${endpoint}/~redirect`);
        expect(result.$.documentInfo().url).toStrictEqual(url);
      });

      test('POST送信後にクッキーがセットされリダイレクト先に飛ぶ', () => {
        return new Promise((resolve) => {
          const url = `${endpoint}/manual/euc-jp.html`;
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const result = $('form[name=login]').submitSync();
            expect(typeOf(result.response.cookies)).toStrictEqual('object');
            expect(result.response.cookies.user).toStrictEqual('guest');
            expect(result.$.documentInfo().url).toStrictEqual(url);
            expect(JSON.parse(result.response.headers['redirect-history'])).toStrictEqual([
              '/form/utf-8.html',
              '/~redirect',
              '/manual/euc-jp.html'
            ]);
            resolve();
          });
        });
      });
    });

    describe('meta refresh', () => {
      beforeEach(() => {
        cli.set('followMetaRefresh', true);
      });

      test('meta[refresh]タグを検知してリダイレクト先に飛ぶ(絶対URL)', () => {
        const url = `${endpoint}/refresh/absolute.html`;
        const result = cli.fetchSync(url);
        expect(result.$.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
        expect(result.response.headers.referer).toStrictEqual(url);
      });

      test('meta[refresh]タグを検知してリダイレクト先に飛ぶ(相対URL)', () => {
        const url = `${endpoint}/refresh/relative.html`;
        const result = cli.fetchSync(url);
        expect(result.$.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
        expect(result.response.headers.referer).toStrictEqual(url);
      });

      test('followMetaRefresh:false => meta[refresh]タグがあってもリダイレクトしない', () => {
        cli.set('followMetaRefresh', false);
        const url = `${endpoint}/refresh/absolute.html`;
        const result = cli.fetchSync(url);
        expect(result.$.documentInfo().url).toStrictEqual(url);
      });

      test('IE条件コメント内のmeta[refresh]タグはリダイレクト対象外', () => {
        const url = `${endpoint}/refresh/ie-only.html`;
        const result = cli.fetchSync(url);
        expect(result.$.documentInfo().url).toStrictEqual(url);
        expect(result.$('title').text()).toStrictEqual('Refresh IE only');
      });
    });
  });
});

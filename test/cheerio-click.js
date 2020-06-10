const typeOf = require('type-of');
const each = require('foreach');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('cheerio:click', () => {
  describe('対応している要素以外 => エラー', () => {
    each(
      [
        'html',
        'body',
        'div',
        'form',
        'textarea',
        'input[type=reset]',
        'input[type=checkbox]',
        'input[type=radio]',
        'select'
      ],
      (elem) => {
        test(elem, () => {
          return new Promise((resolve) => {
            cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
              $(elem)
                .eq(0)
                .click((err, $, res, body) => {
                  expect(err).toBeDefined();
                  expect(err.message).toStrictEqual('element is not clickable');
                  expect(res).toBeUndefined();
                  expect($).toBeUndefined();
                  expect(body).toBeUndefined();
                  resolve();
                });
            });
          });
        });
      }
    );
  });

  describe('要素数0 => エラー', () => {
    each(['header', 'p', 'span', 'input[type=button]'], (elem) => {
      test(elem, () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            $(elem).click((err, $, res, body) => {
              expect(err).toBeDefined();
              expect(err.message).toStrictEqual('no elements');
              expect(res).toBeUndefined();
              expect($).toBeUndefined();
              expect(body).toBeUndefined();
              resolve();
            });
          });
        });
      });
    });
  });

  describe('a要素', () => {
    test('相対パスリンク => 現在のページを基準にしたリンク先を取得する', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          $('.rel').click((err, $, res, body) => {
            expect(err).toBeUndefined();
            expect($.documentInfo()).toStrictEqual({
              url: `${endpoint}/auto/euc-jp.html`,
              encoding: 'euc-jp',
              isXml: false
            });
            expect(typeOf(res)).toStrictEqual('object');
            expect(typeOf($)).toStrictEqual('function');
            expect(typeOf(body)).toStrictEqual('string');
            resolve();
          });
        });
      });
    });

    test('外部URLリンク => そのURLのリンク先を取得する', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          $('.external').click((err, $, res, body) => {
            expect(err).toBeUndefined();
            expect($.documentInfo()).toStrictEqual({
              url: 'https://www.yahoo.co.jp:443/',
              encoding: 'utf-8',
              isXml: false
            });
            expect(typeOf(res)).toStrictEqual('object');
            expect(typeOf($)).toStrictEqual('function');
            expect(typeOf(body)).toStrictEqual('string');
            resolve();
          });
        });
      });
    });

    test('ルートからの絶対パスリンク => ドキュメントルートを基準にしたリンク先を取得する', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          $('.root').click((err, $, res, body) => {
            expect(err).toBeUndefined();
            expect($.documentInfo().url).toStrictEqual(`${`${endpoint}/~info`}?hoge=fuga&piyo=`);
            expect(typeOf(res)).toStrictEqual('object');
            expect(typeOf($)).toStrictEqual('function');
            expect(typeOf(body)).toStrictEqual('string');
            resolve();
          });
        });
      });
    });

    test('javascriptリンク => エラー', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          $('.js').click((err, $, res, body) => {
            expect(err).toBeDefined();
            expect(err.message).toStrictEqual('Invalid URI "javascript:history.back();"');
            expect(res).toBeUndefined();
            expect($).toBeUndefined();
            expect(body).toBeUndefined();
            resolve();
          });
        });
      });
    });

    test('ハッシュリンク => 結果的に同じページを取得するが現在のページ情報にハッシュが追加される', () => {
      return new Promise((resolve) => {
        const url = `${endpoint}/form/utf-8.html`;
        cli.fetch(url, (err, $, res, body) => {
          $('.hash').click((err, $, res, body) => {
            expect(err).toBeUndefined();
            expect($.documentInfo().url).toStrictEqual(`${url}#hoge`);
            expect(typeOf(res)).toStrictEqual('object');
            expect(typeOf($)).toStrictEqual('function');
            expect(typeOf(body)).toStrictEqual('string');
            resolve();
          });
        });
      });
    });

    test('複数のa要素 => 先頭のリンクのみが対象となる', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          $('a').click((err, $, res, body) => {
            expect(err).toBeUndefined();
            expect($.documentInfo()).toStrictEqual({
              url: `${endpoint}/auto/euc-jp.html`,
              encoding: 'euc-jp',
              isXml: false
            });
            expect(typeOf(res)).toStrictEqual('object');
            expect(typeOf($)).toStrictEqual('function');
            expect(typeOf(body)).toStrictEqual('string');
            resolve();
          });
        });
      });
    });

    each([0, 1, 2], (idx) => {
      test(`生のa要素 => リンク先を取得できる(${idx}番目)`, () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            $($('.rel')[idx]).click((err, $, res, body) => {
              expect(err).toBeUndefined();
              expect($.documentInfo()).toStrictEqual({
                url: `${endpoint}/auto/euc-jp.html`,
                encoding: 'euc-jp',
                isXml: false
              });
              expect(typeOf(res)).toStrictEqual('object');
              expect(typeOf($)).toStrictEqual('function');
              expect(typeOf(body)).toStrictEqual('string');
              resolve();
            });
          });
        });
      });
    });

    test('無から作成したa要素(jQuery形式) => リンク先を取得できる', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const url = `${endpoint}/auto/utf-8.html`;
          $('<a/>')
            .attr('href', url)
            .click((err, $, res, body) => {
              expect(err).toBeUndefined();
              expect($.documentInfo()).toStrictEqual({
                url: url,
                encoding: 'utf-8',
                isXml: false
              });
              expect(typeOf(res)).toStrictEqual('object');
              expect(typeOf($)).toStrictEqual('function');
              expect(typeOf(body)).toStrictEqual('string');
              resolve();
            });
        });
      });
    });

    test('無から作成したa要素(HTML形式) => リンク先を取得できる', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const url = `${endpoint}/auto/shift_jis.html`;
          $(`<a href="${url}">link</a>`).click((err, $, res, body) => {
            expect(err).toBeUndefined();
            expect($.documentInfo()).toStrictEqual({
              url: url,
              encoding: 'shift_jis',
              isXml: false
            });
            expect(typeOf(res)).toStrictEqual('object');
            expect(typeOf($)).toStrictEqual('function');
            expect(typeOf(body)).toStrictEqual('string');
            resolve();
          });
        });
      });
    });
  });

  describe('input[type=submit]要素', () => {
    test('所属しているformのsubmitを実行する(編集ボタンのパラメータがセットされる)', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          $('form[name="multi-submit"] input[name=edit]').click((err, $, res, body) => {
            expect(err).toBeUndefined();
            expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
            const h = res.headers;
            expect(h['request-url']).toStrictEqual('/~info');
            expect(h['request-method']).toStrictEqual('POST');
            const data = [
              ['text', 'あいうえお'],
              ['checkbox', 'bbb'],
              ['edit', '編集']
            ]
              .map((v) => `${encodeURIComponent(v[0])}=${encodeURIComponent(v[1])}`)
              .join('&');
            expect(h['post-data']).toStrictEqual(data);
            expect(typeOf($)).toStrictEqual('function');
            expect(typeOf(body)).toStrictEqual('string');
            resolve();
          });
        });
      });
    });
  });

  describe('button[type=submit]要素', () => {
    test('所属しているformのsubmitを実行する(削除ボタンのパラメータがセットされる)', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          $('form[name="multi-submit"] button[name=delete]').click((err, $, res, body) => {
            expect(err).toBeUndefined();
            expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
            const h = res.headers;
            expect(h['request-url']).toStrictEqual('/~info');
            expect(h['request-method']).toStrictEqual('POST');
            const data = [
              ['text', 'あいうえお'],
              ['checkbox', 'bbb'],
              ['delete', '削除']
            ]
              .map((v) => `${encodeURIComponent(v[0])}=${encodeURIComponent(v[1])}`)
              .join('&');
            expect(h['post-data']).toStrictEqual(data);
            expect(typeOf($)).toStrictEqual('function');
            expect(typeOf(body)).toStrictEqual('string');
            resolve();
          });
        });
      });
    });
  });

  describe('input[type=image]要素', () => {
    test('所属しているformのsubmitを実行する(パラメータとしてx,y座標がセットされる)', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          $('form[name="multi-submit"] input[name=tweet]').click((err, $, res, body) => {
            expect(err).toBeUndefined();
            expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
            const h = res.headers;
            expect(h['request-url']).toStrictEqual('/~info');
            expect(h['request-method']).toStrictEqual('POST');
            const data = [
              ['text', 'あいうえお'],
              ['checkbox', 'bbb'],
              ['tweet.x', 0],
              ['tweet.y', 0]
            ]
              .map((v) => `${encodeURIComponent(v[0])}=${encodeURIComponent(v[1])}`)
              .join('&');
            expect(h['post-data']).toStrictEqual(data);
            expect(typeOf($)).toStrictEqual('function');
            expect(typeOf(body)).toStrictEqual('string');
            resolve();
          });
        });
      });
    });
  });
});

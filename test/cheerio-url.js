const typeOf = require('type-of');
const each = require('foreach');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('cheerio:url', () => {
  describe('対応していない要素 => エラー', () => {
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
              expect(() => $(elem).eq(0).url()).toThrow('element is not link, img, script or link');
              resolve();
            });
          });
        });
      }
    );
  });

  describe('要素数0 => []を返す', () => {
    each(['header', 'p', 'span', 'input[type=button]'], (elem) => {
      test(elem, () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const actual = $(elem).eq(0).url();
            expect(typeOf(actual)).toStrictEqual('array');
            expect(actual.length).toStrictEqual(0);
            resolve();
          });
        });
      });
    });
  });

  test('相対パスリンク => 現在のページを基準にした絶対URLを返す', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const actual = $('.rel').eq(0).url();
        expect(actual).toStrictEqual(`${endpoint}/auto/euc-jp.html`);
        resolve();
      });
    });
  });

  test('外部URLリンク => URLをそのまま返す', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const actual = $('.external').url();
        expect(actual).toStrictEqual('http://www.yahoo.co.jp/');
        resolve();
      });
    });
  });

  test('ルートからの絶対パスリンク => ドキュメントルートを基準にした絶対URLを返す', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const actual = $('.root').url();
        expect(actual).toStrictEqual(`${`${endpoint}/~info`}?hoge=fuga&piyo=`);
        resolve();
      });
    });
  });

  test('javascriptリンク => そのまま返す(javascript:...)', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const actual = $('.js').url();
        expect(actual).toStrictEqual('javascript:history.back();');
        resolve();
      });
    });
  });

  test('ハッシュリンク => 現在のページのURLの末尾にハッシュを追加して返す', () => {
    return new Promise((resolve) => {
      const url = `${endpoint}/form/utf-8.html`;
      cli.fetch(url, (err, $, res, body) => {
        const actual = $('.hash').url();
        expect(actual).toStrictEqual(`${url}#hoge`);
        resolve();
      });
    });
  });

  test('複数のa要素 => 絶対URLの配列を返す', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const expcted = [
          `${endpoint}/auto/euc-jp.html`,
          `${endpoint}/auto/euc-jp.html`,
          `${endpoint}/auto/euc-jp.html`,
          undefined,
          '',
          `${endpoint}/~info?hoge=fuga&piyo=`,
          'http://www.yahoo.co.jp/',
          'javascript:history.back();',
          `${`${endpoint}/form/utf-8.html`}#hoge`,
          `${endpoint}/form/xxx.html`
        ];
        const actual = $('a').url();
        expect(actual).toStrictEqual(expcted);
        resolve();
      });
    });
  });

  test('hrefが指定されていないa要素 => undefinedを返す', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const actual = $('.undef').url();
        expect(typeOf(actual)).toStrictEqual('undefined');
        resolve();
      });
    });
  });

  test('hrefが空のa要素 => 空文字を返す', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const actual = $('.empty').url();
        expect(actual).toStrictEqual('');
        resolve();
      });
    });
  });

  each([0, 1, 2], (idx) => {
    test(`生のa要素 => 絶対URLを取得できる(${idx}番目)`, () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const actual = $($('.rel')[idx]).url();
          expect(actual).toStrictEqual(`${endpoint}/auto/euc-jp.html`);
          resolve();
        });
      });
    });
  });

  test('無から作成したa要素(jQuery形式) => 絶対URLを取得できる', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const actual = $('<a/>').attr('href', '../auto/shift_jis.html').url();
        expect(actual).toStrictEqual(`${endpoint}/auto/shift_jis.html`);
        resolve();
      });
    });
  });

  test('無から作成したa要素(HTML形式) => 絶対URLを取得できる', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const actual = $('<a href="/top.php?login=1">link</a>').url();
        expect(actual).toStrictEqual(`${endpoint}/top.php?login=1`);
        resolve();
      });
    });
  });

  describe('filterオプション', () => {
    describe('absolute: false => 絶対URLリンクは除外される', () => {
      test('単一要素 => undefined', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const actual = $('.external').url({ absolute: false });
            expect(typeOf(actual)).toStrictEqual('undefined');
            resolve();
          });
        });
      });

      test('複数要素 => 絶対URLリンクを除外したURL配列を返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const expcted = [
              `${endpoint}/auto/euc-jp.html`,
              `${endpoint}/auto/euc-jp.html`,
              `${endpoint}/auto/euc-jp.html`,
              undefined,
              '',
              `${endpoint}/~info?hoge=fuga&piyo=`,
              'javascript:history.back();',
              `${endpoint}/form/utf-8.html#hoge`,
              `${endpoint}/form/xxx.html`
            ];
            const actual = $('a').url({ absolute: false });
            expect(actual).toStrictEqual(expcted);
            resolve();
          });
        });
      });
    });

    describe('relative: false => 相対URLリンクは除外される', () => {
      test('単一要素 => undefined', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const actual = $('.rel').eq(0).url({ relative: false });
            expect(typeOf(actual)).toStrictEqual('undefined');
            resolve();
          });
        });
      });

      test('複数要素 => 相対URLリンクを除外したURL配列を返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const expcted = [
              undefined,
              '',
              'http://www.yahoo.co.jp/',
              'javascript:history.back();'
            ];
            const actual = $('a').url({ relative: false });
            expect(actual).toStrictEqual(expcted);
            resolve();
          });
        });
      });
    });

    describe('invalid: false => URLでないものは除外される', () => {
      test('単一要素(hrefなし) => undefined', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const actual = $('.undef').url({ invalid: false });
            expect(typeOf(actual)).toStrictEqual('undefined');
            resolve();
          });
        });
      });

      test('単一要素(空) => undefined', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const actual = $('.empty').url({ invalid: false });
            expect(typeOf(actual)).toStrictEqual('undefined');
            resolve();
          });
        });
      });

      test('単一要素(javascript) => undefined', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const actual = $('.js').url({ invalid: false });
            expect(typeOf(actual)).toStrictEqual('undefined');
            resolve();
          });
        });
      });

      test('複数要素 => URLでないものを除外したURL配列を返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const expcted = [
              `${endpoint}/auto/euc-jp.html`,
              `${endpoint}/auto/euc-jp.html`,
              `${endpoint}/auto/euc-jp.html`,
              `${endpoint}/~info?hoge=fuga&piyo=`,
              'http://www.yahoo.co.jp/',
              `${`${endpoint}/form/utf-8.html`}#hoge`,
              `${endpoint}/form/xxx.html`
            ];
            const actual = $('a').url({ invalid: false });
            expect(actual).toStrictEqual(expcted);
            resolve();
          });
        });
      });
    });

    describe('複合 => それぞれのfilterが組み合わせる', () => {
      test('absolute: false & relative: false => URLでないもののみ返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const expcted = [undefined, '', 'javascript:history.back();'];
            const actual = $('a').url({
              absolute: false,
              relative: false
            });
            expect(actual).toStrictEqual(expcted);
            resolve();
          });
        });
      });

      test('absolute: false & invalid: false => 相対URLのみ返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const expcted = [
              `${endpoint}/auto/euc-jp.html`,
              `${endpoint}/auto/euc-jp.html`,
              `${endpoint}/auto/euc-jp.html`,
              `${endpoint}/~info?hoge=fuga&piyo=`,
              `${endpoint}/form/utf-8.html#hoge`,
              `${endpoint}/form/xxx.html`
            ];
            const actual = $('a').url({
              absolute: false,
              invalid: false
            });
            expect(actual).toStrictEqual(expcted);
            resolve();
          });
        });
      });

      test('relative: false & invalid: false => 絶対URLのみ返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const expcted = ['http://www.yahoo.co.jp/'];
            const actual = $('a').url({
              relative: false,
              invalid: false
            });
            expect(actual).toStrictEqual(expcted);
            resolve();
          });
        });
      });
    });
  });

  describe('img要素', () => {
    const base64img = helper.toBase64('img/img/sports.jpg');

    test('単一要素 => srcに指定したURLを絶対URLにして返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/img/index.html`, (err, $, res, body) => {
          const expected = `${endpoint}/img/img/cat.html`.replace(/\.html/, '.png');
          const actual = $('.rel').url();
          expect(actual).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('複数要素 => 各要素のsrcのURLを絶対URLにした配列を返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/img/index.html`, (err, $, res, body) => {
          const base = `${endpoint}/img`;
          const expected = [
            `${base}/img/cat.png`,
            `${base}/~mega`,
            `${base}/img/1x1.gif`,
            `${base}/img/1x1.gif`,
            `${base}/img/1x1.gif`,
            undefined,
            '',
            `${base}/img/food.jpg?hoge=fuga&piyo=`,
            'http://www.yahoo.co.jp/favicon.ico',
            'javascript:getPicture();',
            `${base}/not-found.gif`,
            `data:image/jpg;base64,${base64img}`
          ];
          const actual = $('img').url([]);
          expect(actual).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('Base64はURLでないものとして扱われる', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/img/index.html`, (err, $, res, body) => {
          const actual = $('.base64').url({ invalid: false });
          expect(typeOf(actual)).toStrictEqual('undefined');
          resolve();
        });
      });
    });

    describe('srcAttrs', () => {
      test('無指定 => デフォルトの優先順で属性を検索する', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/img/index.html`, (err, $, res, body) => {
            const base = `${endpoint}/img`;
            expect($('.lazy1').url()).toStrictEqual(`${base}/img/cat.png`);
            expect($('.lazy2').url()).toStrictEqual(`${base}/img/food.jpg`);
            expect($('.lazy3').url()).toStrictEqual(`${base}/img/1x1.gif`);
            resolve();
          });
        });
      });

      test('文字列 => 指定した文字列属性をsrcよりも優先して検索する', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/img/index.html`, (err, $, res, body) => {
            const base = `${endpoint}/img`;
            const attr = 'data-original-src';
            expect($('.lazy1').url(attr)).toStrictEqual(`${base}/img/1x1.gif`);
            expect($('.lazy2').url(attr)).toStrictEqual(`${base}/img/1x1.gif`);
            expect($('.lazy3').url(attr)).toStrictEqual(`${base}/img/sports.jpg`);
            resolve();
          });
        });
      });

      test('配列 => 指定した配列順で検索する', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/img/index.html`, (err, $, res, body) => {
            const base = `${endpoint}/img`;
            const attr = ['data-original-src', 'data-original', 'data-lazy-src'];
            expect($('.lazy1').url(attr)).toStrictEqual(`${base}/img/cat.png`);
            expect($('.lazy2').url(attr)).toStrictEqual(`${base}/img/food.jpg`);
            expect($('.lazy3').url(attr)).toStrictEqual(`${base}/img/sports.jpg`);
            resolve();
          });
        });
      });

      test('存在しない属性 => srcのURLを絶対URLにして返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/img/index.html`, (err, $, res, body) => {
            const base = `${endpoint}/img`;
            const attr = ['data-foo-bar'];
            expect($('.lazy1').url(attr)).toStrictEqual(`${base}/img/1x1.gif`);
            expect($('.lazy2').url(attr)).toStrictEqual(`${base}/img/1x1.gif`);
            expect($('.lazy3').url(attr)).toStrictEqual(`${base}/img/1x1.gif`);
            resolve();
          });
        });
      });

      test('空配列 => srcのURLを絶対URLにして返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/img/index.html`, (err, $, res, body) => {
            const base = `${endpoint}/img`;
            expect($('.lazy1').url([])).toStrictEqual(`${base}/img/1x1.gif`);
            expect($('.lazy2').url([])).toStrictEqual(`${base}/img/1x1.gif`);
            expect($('.lazy3').url([])).toStrictEqual(`${base}/img/1x1.gif`);
            resolve();
          });
        });
      });
    });
  });

  describe('a要素とimg要素の複合', () => {
    const base64img = helper.toBase64('img/img/sports.jpg');

    test('各要素のhref/srcのURLを絶対URLにした配列を返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/img/index.html`, (err, $, res, body) => {
          const base = `${endpoint}/img`;
          const expected = [
            `${base}/img/cat.png`,
            `${base}/~mega`,
            `${base}/img/1x1.gif`,
            `${base}/img/1x1.gif`,
            `${base}/img/1x1.gif`,
            undefined,
            '',
            `${base}/img/food.jpg?hoge=fuga&piyo=`,
            'http://www.yahoo.co.jp/favicon.ico',
            'javascript:getPicture();',
            `${base}/not-found.gif`,
            `data:image/jpg;base64,${base64img}`,
            'http://www.google.co.jp/',
            `${endpoint}/~info?foo=1&bar=2&baz=3`,
            `${endpoint}/img/file/foobarbaz.zip`,
            `${endpoint}/img/file/foobarbaz.txt`
          ];
          const actual = $('img, a').url([]);
          expect(actual).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('filterオプション(外部リンクのみ取得)', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/img/index.html`, (err, $, res, body) => {
          const expected = ['http://www.yahoo.co.jp/favicon.ico', 'http://www.google.co.jp/'];
          const actual = $('img, a').url({ relative: false, invalid: false });
          expect(actual).toStrictEqual(expected);
          resolve();
        });
      });
    });
  });

  describe('script要素', () => {
    test('単一要素 => srcに指定したURLを絶対URLにして返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/script/index.html`, (err, $, res, body) => {
          const expected = `${endpoint}/script/js/cat.html`.replace(/\.html/, '.js');
          const actual = $('.rel').url();
          expect(actual).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('単一のインラインでJavaScriptが書かれているscript要素 => srcには何も指定がないのでundefinedで返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/script/index.html`, (err, $, res, body) => {
          const actual = $('.inline').url();
          expect(typeOf(actual)).toStrictEqual('undefined');
          resolve();
        });
      });
    });

    test('複数要素 => 各要素のsrcのURLを絶対URLにした配列を返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/script/index.html`, (err, $, res, body) => {
          const base = `${endpoint}/script`;
          const expected = [
            `${base}/js/cat.js`,
            undefined,
            '',
            `${base}/js/food.js?hoge=fuga&piyo=`,
            'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js',
            `${base}/not-found.js`,
            undefined,
            `${base}/js/dog.js`
          ];
          const actual = $('script').url([]);
          expect(actual).toStrictEqual(expected);
          resolve();
        });
      });
    });
  });

  describe('link要素', () => {
    test('単一要素 => hrefに指定したURLを絶対URLにして返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/link/index.html`, (err, $, res, body) => {
          const expected = `${endpoint}/link/css/cat.html`.replace(/\.html/, '.css');
          const actual = $('.rel').url();
          expect(actual).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('複数要素 => 各要素のhrefのURLを絶対URLにした配列を返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/link/index.html`, (err, $, res, body) => {
          const base = `${endpoint}/link`;
          const expected = [
            `${base}/css/cat.css`,
            undefined,
            '',
            `${base}/css/food.css?hoge=fuga&piyo=`,
            'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
            `${base}/not-found.css`,
            `${base}/en.html`,
            `${base}/css/dog.css`
          ];
          const actual = $('link').url([]);
          expect(actual).toStrictEqual(expected);
          resolve();
        });
      });
    });
  });
});

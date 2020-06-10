const typeOf = require('type-of');
const each = require('foreach');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('cheerio:submit', () => {
  test('form要素以外 => エラー', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('div')
          .eq(0)
          .submit({ hoge: 'fuga' }, (err, $, res, body) => {
            expect(err.message).toStrictEqual('element is not form');
            expect($).toBeUndefined();
            expect(res).toBeUndefined();
            expect(body).toBeUndefined();
            resolve();
          });
      });
    });
  });

  test('要素数0 => エラー', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('header').submit({ hoge: 'fuga' }, (err, $, res, body) => {
          expect(err.message).toStrictEqual('no elements');
          expect($).toBeUndefined();
          expect(res).toBeUndefined();
          expect(body).toBeUndefined();
          resolve();
        });
      });
    });
  });

  test('form要素のaction, method属性でフォームが送信される(GET)', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('form[name=get]').submit((err, $, res, body) => {
          expect($.documentInfo().url).toStrictEqual(`${`${endpoint}/~info`}?hoge=fuga`);
          const h = res.headers;
          expect(h['request-url']).toStrictEqual('/~info?hoge=fuga');
          expect(h['request-method']).toStrictEqual('GET');
          expect(h['post-data']).toBeUndefined();
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  test('form要素のaction, method属性でフォームが送信される(POST)', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('form[name=post]').submit((err, $, res, body) => {
          expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
          const h = res.headers;
          expect(h['request-url']).toStrictEqual('/~info');
          expect(h['request-method']).toStrictEqual('POST');
          expect(h['post-data']).toStrictEqual('hoge=fuga');
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  test('form要素のmethod属性がない => GETでフォームが送信される', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('form[name="no-method"]').submit((err, $, res, body) => {
          expect($.documentInfo().url).toStrictEqual(`${`${endpoint}/~info`}?hoge=fuga`);
          const h = res.headers;
          expect(h['request-url']).toStrictEqual('/~info?hoge=fuga');
          expect(h['request-method']).toStrictEqual('GET');
          expect(h['post-data']).toBeUndefined();
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  test('form要素のaction属性もmethod属性もない => GETかつ現ページに対してフォームが送信される', () => {
    return new Promise((resolve) => {
      const url = `${endpoint}/form/utf-8.html`;
      cli.fetch(url, (err, $, res, body) => {
        $('form[name="no-action-no-method"]').submit((err, $, res, body) => {
          expect($.documentInfo().url).toStrictEqual(`${url}?hoge=fuga`);
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  test('select要素を含んだフォームのselectedがフォーム送信パラメータのデフォルトになっている', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('form[name=select]').submit((err, $, res, body) => {
          expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
          const h = res.headers;
          expect(h['request-url']).toStrictEqual('/~info');
          expect(h['request-method']).toStrictEqual('POST');
          expect(h['post-data']).toStrictEqual('single=2&multi=3&multi=5');
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  test('checkbox要素を含んだフォームのcheckedがフォーム送信パラメータのデフォルトになっている', () => {
    return new Promise((resolve) => {
      const param = '?check1=1&check2=&check3=&check4%5B%5D=';
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('form[name=checkbox]').submit((err, $, res, body) => {
          expect($.documentInfo().url).toStrictEqual(`${`${endpoint}/~info`}${param}`);
          const h = res.headers;
          expect(h['request-url']).toStrictEqual(`/~info${param}`);
          expect(h['request-method']).toStrictEqual('GET');
          expect(h['post-data']).toBeUndefined();
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  test('radio要素を含んだフォームのcheckedがフォーム送信パラメータのデフォルトになっている', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('form[name=radio]').submit((err, $, res, body) => {
          expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
          const h = res.headers;
          expect(h['request-url']).toStrictEqual('/~info');
          expect(h['request-method']).toStrictEqual('POST');
          expect(h['post-data']).toStrictEqual('radio1=yyy&radio2=');
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  test('input[type=submit]とinput[type=image]はパラメータに含まれない', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('form[name="multi-submit"]').submit((err, $, res, body) => {
          expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
          const h = res.headers;
          expect(h['request-url']).toStrictEqual('/~info');
          expect(h['request-method']).toStrictEqual('POST');
          expect(h['post-data']).toStrictEqual(
            'text=%E3%81%82%E3%81%84%E3%81%86%E3%81%88%E3%81%8A&checkbox=bbb'
          );
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  test('input要素のvalueがない => 空文字となる', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('form[name=no-input-value]').submit((err, $, res, body) => {
          expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
          const h = res.headers;
          expect(h['request-url']).toStrictEqual('/~info');
          expect(h['request-method']).toStrictEqual('POST');
          expect(h['post-data']).toStrictEqual('hoge=');
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  test('パラメータのvalueがnull/undefined/empty => "name="という形でURLに追加される', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('form[name=post]').submit(
          {
            foo: null,
            bar: undefined,
            baz: ''
          },
          (err, $, res, body) => {
            expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
            const h = res.headers;
            expect(h['request-url']).toStrictEqual('/~info');
            expect(h['request-method']).toStrictEqual('POST');
            expect(h['post-data']).toStrictEqual('hoge=fuga&foo=&bar=&baz=');
            expect(typeOf($)).toStrictEqual('function');
            expect(typeOf(body)).toStrictEqual('string');
            resolve();
          }
        );
      });
    });
  });

  test('パラメータのvalueが数字の0 => "name=0"という形でURLに追加される', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('form[name=post]').submit({ hoge: 0 }, (err, $, res, body) => {
          expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
          const h = res.headers;
          expect(h['request-url']).toStrictEqual('/~info');
          expect(h['request-method']).toStrictEqual('POST');
          expect(h['post-data']).toStrictEqual('hoge=0');
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  each([0, 1, 2], (idx) => {
    test(`生のform要素 => フォーム送信される(${idx}番目)`, () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          $($('.form-group form')[idx]).submit((err, $, res, body) => {
            expect($.documentInfo().url).toStrictEqual(`${`${endpoint}/~info`}?hoge=fuga`);
            const h = res.headers;
            expect(h['request-url']).toStrictEqual('/~info?hoge=fuga');
            expect(h['request-method']).toStrictEqual('GET');
            expect(h['post-data']).toBeUndefined();
            expect(typeOf($)).toStrictEqual('function');
            expect(typeOf(body)).toStrictEqual('string');
            resolve();
          });
        });
      });
    });
  });

  test('無から作成したform要素(jQuery形式) => フォーム送信される', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const $form = $('<form/>')
          .attr({
            method: 'GET',
            action: '/~info'
          })
          .append(
            $('<input/>').attr({
              type: 'hidden',
              name: 'hoge',
              value: 'fuga'
            })
          )
          .append(
            $('<input/>').attr({
              type: 'text',
              name: 'foo',
              value: 'あいうえお'
            })
          );

        $form.submit((err, $, res, body) => {
          const param = `hoge=fuga&foo=${encodeURIComponent('あいうえお')}`;
          expect($.documentInfo().url).toStrictEqual(`${`${endpoint}/~info`}?${param}`);
          const h = res.headers;
          expect(h['request-url']).toStrictEqual(`/~info?${param}`);
          expect(h['request-method']).toStrictEqual('GET');
          expect(h['post-data']).toBeUndefined();
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  test('無から作成したform要素(HTML形式) => フォーム送信される', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const $form = $(
          [
            '<form method="POST" action="/~info">',
            '<input type="hidden" name="hoge" value="fuga" />',
            '<input type="text" name="foo" value="あいうえお" />',
            '</form>'
          ].join('\n')
        );
        $form.submit({ foo: 'かきくけこ' }, (err, $, res, body) => {
          const param = `hoge=fuga&foo=${encodeURIComponent('かきくけこ')}`;
          expect($.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
          const h = res.headers;
          expect(h['request-url']).toStrictEqual('/~info');
          expect(h['request-method']).toStrictEqual('POST');
          expect(h['post-data']).toStrictEqual(param);
          expect(typeOf($)).toStrictEqual('function');
          expect(typeOf(body)).toStrictEqual('string');
          resolve();
        });
      });
    });
  });

  const escapes = helper.escapedParam();
  each(helper.files('form'), (enc) => {
    describe(`cheerio:submit(${enc})`, () => {
      test('デフォルトパラメータが日本語 => ページのエンコーディングに合わせたURLエンコードで送信される', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/${enc}.html`, (err, $, res, body) => {
            $('form[name=default-jp]').submit((err, $, res, body) => {
              const qp = helper.qsparse(res.headers['post-data']);
              expect(Object.keys(qp).sort()).toStrictEqual([
                'checkbox',
                'radio',
                'select',
                'text',
                'textarea'
              ]);
              expect(qp.text).toStrictEqual(escapes['あいうえお'][enc]);
              expect(qp.checkbox).toStrictEqual(escapes['かきくけこ'][enc]);
              expect(qp.radio).toStrictEqual(escapes['なにぬねの'][enc]);
              expect(qp.select).toStrictEqual([
                escapes['ふふふふふ'][enc],
                escapes['ほほほほほ'][enc]
              ]);
              expect(qp.textarea).toStrictEqual(escapes['まみむめも'][enc]);
              resolve();
            });
          });
        });
      });

      test('上書きパラメータが日本語 => ページのエンコーディングに合わせたURLエンコードで送信される', () => {
        return new Promise((resolve) => {
          const set = {
            text: 'かきくけこ',
            checkbox: null,
            radio: 'たちつてと',
            select: ['ははははは', 'へへへへへ'],
            textarea: ''
          };
          cli.fetch(`${endpoint}/form/${enc}.html`, (err, $, res, body) => {
            $('form[name=default-jp]').submit(set, (err, $, res, body) => {
              const qp = helper.qsparse(res.headers['post-data']);
              expect(Object.keys(qp).sort()).toStrictEqual([
                'checkbox',
                'radio',
                'select',
                'text',
                'textarea'
              ]);
              expect(qp.text).toStrictEqual(escapes['かきくけこ'][enc]);
              expect(qp.checkbox).toStrictEqual('');
              expect(qp.radio).toStrictEqual(escapes['たちつてと'][enc]);
              expect(qp.select).toStrictEqual([
                escapes['ははははは'][enc],
                escapes['へへへへへ'][enc]
              ]);
              expect(qp.textarea).toStrictEqual('');
              resolve();
            });
          });
        });
      });

      const expectedEncodings = {
        shift_jis: 'utf-8',
        'euc-jp': 'shift_jis',
        'utf-8': 'euc-jp'
      };
      test(`accept-chaset属性あり => accept-charsetで指定されたURLエンコードで送信される(${expectedEncodings[enc]})`, () => {
        const param = { q: 'かきくけこ' };
        return cli
          .fetch(`${endpoint}/form/${enc}.html`)
          .then((result1) => result1.$('form[name=charset]').submit(param))
          .then((result2) => {
            const actual = result2.response.headers['request-url'];
            const expected = `/~info?q=${escapes[param.q][expectedEncodings[enc]]}`;
            expect(actual).toStrictEqual(expected);
          });
      });

      test(`accept-chaset属性あり(複数) => accept-charsetで指定された先頭のURLエンコードで送信される(${expectedEncodings[enc]})`, () => {
        const param = { q: 'さしすせそ' };
        return cli
          .fetch(`${endpoint}/form/${enc}.html`)
          .then((result1) => result1.$('form[name="multi-charset"]').submit(param))
          .then((result2) => {
            const actual = result2.response.headers['request-url'];
            const expected = `/~info?q=${escapes[param.q][expectedEncodings[enc]]}`;
            expect(actual).toStrictEqual(expected);
          });
      });
    });
  });
});

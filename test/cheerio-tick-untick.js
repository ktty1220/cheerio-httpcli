const typeOf = require('type-of');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('cheerio:tick', () => {
  describe('input[type=checkbox]要素', () => {
    test('input[type=checkbox]要素以外 => 例外発生', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          expect(() => $('input[type=text]').eq(0).tick()).toThrow(
            'element is not checkbox or radio'
          );
          resolve();
        });
      });
    });

    test('要素数0 => 例外発生', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          expect(() => $('input[name=not_found]').tick()).toThrow('no elements');
          resolve();
        });
      });
    });

    test('すでに選択済みのcheckbox => 変化なし', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=checkbox]');
          const $checkbox = $form.find('input[name=check1]');
          const state = $checkbox.attr('checked');
          expect(state).toStrictEqual('checked');
          $checkbox.tick();
          expect($checkbox.attr('checked')).toStrictEqual(state);
          $form.find('input[type=submit]').click((err, $, res, body) => {
            const param = '?check1=1&check2=&check3=&check4%5B%5D=';
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

    test('未選択のcheckbox => 選択状態になる', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=checkbox]');
          const $checkbox = $form.find('input[name=check2]');
          const state = $checkbox.attr('checked');
          expect(typeOf(state)).toStrictEqual('undefined');
          $checkbox.tick();
          expect($checkbox.attr('checked')).toStrictEqual('checked');
          $form.submit((err, $, res, body) => {
            const param = '?check1=1&check2=2&check3=&check4%5B%5D=';
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

    test('複数要素 => 要素すべてが選択状態になる', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=checkbox]');
          const $checkboxes = $form.find('input[type=checkbox]');
          $checkboxes.tick().each((i, el) => {
            expect($(el).attr('checked')).toStrictEqual('checked');
          });
          $form.submit((err, $, res, body) => {
            const param = `?${[
              ['check1', 1],
              ['check2', 2],
              ['check3', 3],
              ['check3', 4],
              ['check3', 5],
              ['check4[]', 'あいうえお'],
              ['check4[]', 'かきくけこ'],
              ['check4[]', 'さしすせそ']
            ]
              .map((v) => `${encodeURIComponent(v[0])}=${encodeURIComponent(v[1])}`)
              .join('&')}`;
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
  });

  describe('input[type=radio]要素', () => {
    test('グループが未選択 => radioを選択状態にする', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=radio]');
          const $before = $form.find('input[name=radio2]:checked');
          expect($before.length).toStrictEqual(0);
          expect(typeOf($before.val())).toStrictEqual('undefined');
          $form.find('input[name=radio2]').eq(0).tick();
          const $after = $form.find('input[name=radio2]:checked');
          expect($after.length).toStrictEqual(1);
          expect($after.val()).toStrictEqual('あいうえお');
          $form.find('input[type=submit]').click((err, $, res, body) => {
            const param = `radio1=yyy&radio2=${encodeURIComponent('あいうえお')}`;
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

    test('すでに選択されているradio => 変化なし', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=radio]');
          const $before = $form.find('input[name=radio1]:checked');
          expect($before.length).toStrictEqual(1);
          expect($before.val()).toStrictEqual('yyy');
          $before.tick();
          const $after = $form.find('input[name=radio1]:checked');
          expect($after.length).toStrictEqual(1);
          expect($after.val()).toStrictEqual('yyy');
          $form.find('input[type=submit]').click((err, $, res, body) => {
            const param = 'radio1=yyy&radio2=';
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

    test('グループ内ですでに選択されている別のradioがある => その選択状態を解除して指定されたradioを選択状態にする', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=radio]');
          const $before = $form.find('input[name=radio1]:checked');
          expect($before.length).toStrictEqual(1);
          expect($before.val()).toStrictEqual('yyy');
          $before.next().tick();
          const $after = $form.find('input[name=radio1]:checked');
          expect($after.length).toStrictEqual(1);
          expect($after.val()).toStrictEqual('zzz');
          $form.find('input[type=submit]').click((err, $, res, body) => {
            const param = 'radio1=zzz&radio2=';
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

    test('複数要素 => 先頭の要素のみが選択状態になる', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=radio]');
          const $before = $form.find('input[name=radio1]:checked');
          expect($before.length).toStrictEqual(1);
          expect($before.val()).toStrictEqual('yyy');
          $form.find('input[name=radio1]').tick();
          const $after = $form.find('input[name=radio1]:checked');
          expect($after.length).toStrictEqual(1);
          expect($after.val()).toStrictEqual('xxx');
          $form.find('input[type=submit]').click((err, $, res, body) => {
            const param = 'radio1=xxx&radio2=';
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
  });

  describe('input[type=checkbox]要素とinput[type=radio]要素の複合', () => {
    test('checkboxとradioが混在した複数要素 => checkboxは指定した全要素を選択、radioは先頭の要素のみが選択状態になる', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=default-jp]');
          $form.find('input[type=checkbox],input[type=radio]').tick();
          expect($form.find('input[type=checkbox]:checked').length).toStrictEqual(
            $form.find('input[type=checkbox]').length
          );
          const $radio = $form.find('input[type=radio]:checked');
          expect($radio.length).toStrictEqual(1);
          expect($radio.val()).toStrictEqual('たちつてと');
          $form.find('textarea').val('やゆよ');
          $form.submit((err, $, res, body) => {
            const qp = helper.qsparse(res.headers['post-data']);
            expect(Object.keys(qp).sort()).toStrictEqual([
              'checkbox',
              'radio',
              'select',
              'text',
              'textarea'
            ]);
            expect(qp.text).toStrictEqual(encodeURIComponent('あいうえお'));
            expect(qp.checkbox).toStrictEqual([
              encodeURIComponent('かきくけこ'),
              encodeURIComponent('さしすせそ')
            ]);
            expect(qp.radio).toStrictEqual(encodeURIComponent('たちつてと'));
            expect(qp.select).toStrictEqual([
              encodeURIComponent('ふふふふふ'),
              encodeURIComponent('ほほほほほ')
            ]);
            expect(qp.textarea).toStrictEqual(encodeURIComponent('やゆよ'));
            resolve();
          });
        });
      });
    });
  });
});

describe('cheerio:untick', () => {
  describe('input[type=checkbox]要素', () => {
    test('input[type=checkbox]要素以外 => 例外発生', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          expect(() => $('input[type=text]').eq(0).untick()).toThrow(
            'element is not checkbox or radio'
          );
          resolve();
        });
      });
    });

    test('要素数0 => 例外発生', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          expect(() => $('input[name=not_found]').untick()).toThrow('no elements');
          resolve();
        });
      });
    });

    test('未選択状態のcheckbox => 変化なし', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=checkbox]');
          const $checkbox = $form.find('input[name=check2]');
          const state = $checkbox.attr('checked');
          expect(typeOf(state)).toStrictEqual('undefined');
          $checkbox.untick();
          expect($checkbox.attr('checked')).toStrictEqual(state);
          $form.find('input[type=submit]').click((err, $, res, body) => {
            const param = '?check1=1&check2=&check3=&check4%5B%5D=';
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

    test('選択状態のcheckbox => 未選択状態になる', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=checkbox]');
          const $checkbox = $form.find('input[name=check1]');
          const state = $checkbox.attr('checked');
          expect(state).toStrictEqual('checked');
          $checkbox.untick();
          expect(typeOf($checkbox.attr('checked'))).toStrictEqual('undefined');
          $form.submit((err, $, res, body) => {
            const param = '?check1=&check2=&check3=&check4%5B%5D=';
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

    test('複数要素 => 要素すべてが未選択状態になる', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=checkbox]');
          const $checkboxes = $form.find('input[type=checkbox]');
          $checkboxes.untick().each((i) => {
            expect(typeOf($(this).attr('checked'))).toStrictEqual('undefined');
          });
          $form.submit((err, $, res, body) => {
            const param = '?check1=&check2=&check3=&check4%5B%5D=';
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
  });

  describe('input[type=radio]要素', () => {
    test('グループが未選択状態 => 変化なし', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=radio]');
          const $before = $form.find('input[name=radio2]:checked');
          expect($before.length).toStrictEqual(0);
          expect(typeOf($before.val())).toStrictEqual('undefined');
          $form.find('input[name=radio2]').eq(0).untick();
          const $after = $form.find('input[name=radio2]:checked');
          expect($after.length).toStrictEqual(0);
          expect(typeOf($after.val())).toStrictEqual('undefined');
          $form.find('input[type=submit]').click((err, $, res, body) => {
            const param = 'radio1=yyy&radio2=';
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

    test('選択状態のradio => 選択状態を解除する', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=radio]');
          const $before = $form.find('input[name=radio1]:checked');
          expect($before.length).toStrictEqual(1);
          expect($before.val()).toStrictEqual('yyy');
          $before.untick();
          const $after = $form.find('input[name=radio1]:checked');
          expect($after.length).toStrictEqual(0);
          expect(typeOf($after.val())).toStrictEqual('undefined');
          $form.find('input[type=submit]').click((err, $, res, body) => {
            const param = 'radio1=&radio2=';
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

    test('未選択状態のradio => 変化なし(選択状態のradioもそのまま)', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=radio]');
          const $before = $form.find('input[name=radio1]:checked');
          expect($before.length).toStrictEqual(1);
          expect($before.val()).toStrictEqual('yyy');
          $before.prev().untick();
          const $after = $form.find('input[name=radio1]:checked');
          expect($after.length).toStrictEqual(1);
          expect($before.val()).toStrictEqual('yyy');
          $form.find('input[type=submit]').click((err, $, res, body) => {
            const param = 'radio1=yyy&radio2=';
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

    test('複数要素 => 要素すべてが未選択状態になる', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=radio]');
          const $before = $form.find('input[name=radio1]:checked');
          expect($before.length).toStrictEqual(1);
          expect($before.val()).toStrictEqual('yyy');
          $form.find('input[name=radio1]').untick();
          const $after = $form.find('input[name=radio1]:checked');
          expect($after.length).toStrictEqual(0);
          expect(typeOf($after.val())).toStrictEqual('undefined');
          $form.find('input[type=submit]').click((err, $, res, body) => {
            const param = 'radio1=&radio2=';
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
  });

  describe('input[type=checkbox]要素とinput[type=radio]要素の複合', () => {
    test('checkboxとradioが混在した複数要素 => checkboxもradioも指定した全要素の選択状態が解除される', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=default-jp]');
          $form.find('input[type=checkbox],input[type=radio]').untick();
          expect($form.find('input[type=checkbox]:checked').length).toStrictEqual(0);
          expect($form.find('input[type=radio]:checked').length).toStrictEqual(0);
          $form.find('select').val('ふふふふふ');
          $form.submit((err, $, res, body) => {
            const qp = helper.qsparse(res.headers['post-data']);
            expect(Object.keys(qp).sort()).toStrictEqual([
              'checkbox',
              'radio',
              'select',
              'text',
              'textarea'
            ]);
            expect(qp.text).toStrictEqual(encodeURIComponent('あいうえお'));
            expect(qp.checkbox).toStrictEqual('');
            expect(qp.radio).toStrictEqual('');
            expect(qp.select).toStrictEqual(encodeURIComponent('ふふふふふ'));
            expect(qp.textarea).toStrictEqual(encodeURIComponent('まみむめも'));
            resolve();
          });
        });
      });
    });
  });
});

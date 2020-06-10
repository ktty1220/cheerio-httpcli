const typeOf = require('type-of');
const assign = require('object-assign');
const each = require('foreach');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('cheerio:field', () => {
  describe('根本的エラー', () => {
    test('form要素以外 => element is not form', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          expect(() => $('div').eq(0).field('user')).toThrow('element is not form');
          resolve();
        });
      });
    });

    test('要素数0 => no elements', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          expect(() => $('header').field('user', 'hoge')).toThrow('no elements');
          resolve();
        });
      });
    });

    test('nameが指定されているが文字列でない => name is not string or object', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          expect(() => $('form[name=login]').field([1, 2, 3])).toThrow(
            'name is not string or object'
          );
          resolve();
        });
      });
    });
  });

  describe('nameのみ指定(設定値取得)', () => {
    test('nameのみ指定 => form配下のname部品の値を取得', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const actual = $('form[name=login]').field('user');
          expect(actual).toStrictEqual('guest');
          resolve();
        });
      });
    });

    test('nameのみの指定でname部品がform内にない => undefined', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const actual = $('form[name=login]').field('user');
          expect(actual).toStrictEqual('guest');
          resolve();
        });
      });
    });

    describe('select', () => {
      test('not multiple => 選択値の文字列を返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=select]');
            const actual = $form.field('single');
            const expected = $form.find('select[name=single]').val();
            expect(actual).toStrictEqual(expected);
            resolve();
          });
        });
      });

      test('multiple(選択) => 選択値の配列を返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=select]');
            const actual = $form.field('multi');
            const expected = $form.find('select[name=multi]').val();
            expect(actual).toStrictEqual(expected);
            resolve();
          });
        });
      });

      test('multiple(未選択) => 空配列を返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=select]');
            $form.find('select[name=multi]').val([]);
            const actual = $form.field('multi');
            expect(typeOf(actual)).toStrictEqual('array');
            expect(actual).toHaveLength(0);
            resolve();
          });
        });
      });
    });

    describe('checkbox', () => {
      test('同名なし(選択) => 選択値の文字列を返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=checkbox]');
            const actual = $form.field('check1');
            expect(actual).toStrictEqual('1');
            resolve();
          });
        });
      });

      test('同名なし(未選択) => undefinedを返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=checkbox]');
            const actual = $form.field('check2');
            expect(typeOf(actual)).toStrictEqual('undefined');
            resolve();
          });
        });
      });

      test('同名複数 => 選択値の配列を返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=checkbox]');
            $form.find('[name="check4[]"]').eq(1).tick();
            const actual = $form.field('check4[]');
            expect(actual).toStrictEqual(['かきくけこ']);
            resolve();
          });
        });
      });

      test('同名複数(未選択) => 空配列を返す', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=checkbox]');
            const actual = $form.field('check4[]');
            expect(typeOf(actual)).toStrictEqual('array');
            expect(actual).toHaveLength(0);
            resolve();
          });
        });
      });
    });
  });

  describe('引数なし', () => {
    test('フォームの全部品とその状態を連想配列で返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=default-jp]');
          const expected = {
            text: 'あいうえお',
            checkbox: ['かきくけこ'],
            radio: 'なにぬねの',
            select: ['ふふふふふ', 'ほほほほほ'],
            textarea: 'まみむめも'
          };
          const actual = $form.field();
          expect(actual).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('submit系要素 => 除外される', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=multi-submit]');
          const expected = {
            text: 'あいうえお',
            checkbox: ['bbb']
          };
          const actual = $form.field();
          expect(actual).toStrictEqual(expected);
          resolve();
        });
      });
    });
  });

  describe('name,valueを指定(nameにvalueをセット)', () => {
    const types = {
      string: 'hey',
      array: [1, 2, 3],
      object: { x: 1, y: 2, z: 3 },
      number: 12,
      functino: () => 'hello',
      date: new Date('2015/12/31 23:59:59'),
      regexp: /asdf/,
      null: null,
      undefined: undefined,
      true: true,
      false: false
    };
    each(types, (val, type) => {
      test(`cheerioで直接セットしたのと同じ状態になる(${type})`, () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=default-jp]');
            const $text = $form.find('input[name=text]');
            $text.val(val);
            const expected = $text.val();
            $form.field('text', val);
            const actual = $form.field('text');
            expect(actual).toStrictEqual(expected);
            resolve();
          });
        });
      });
    });

    describe('複数値を受け付ける部品', () => {
      test('文字列valueをセット => name部品に配列[value]をセット', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=default-jp]');
            const expected = $form.field();
            const set = {
              checkbox: 'さしすせそ',
              select: 'ひひひひひ'
            };
            const enc = {};
            each(set, (val, name) => {
              expected[name] = [val];
              enc[name] = encodeURIComponent(val);
              $form.field(name, val);
            });
            expect($form.field()).toStrictEqual(expected);
            $form.submit((err, $, res, body) => {
              const qp = helper.qsparse(res.headers['post-data']);
              each(set, (val, name) => {
                expect(qp[name]).toStrictEqual(enc[name]);
              });
              resolve();
            });
          });
        });
      });

      test('配列[value ...]をセット => 配列のままセットされる', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=default-jp]');
            const expected = $form.field();
            const set = {
              checkbox: ['かきくけこ', 'さしすせそ'],
              select: ['ははははは', 'ひひひひひ']
            };
            const enc = {};
            each(set, (val, name) => {
              expected[name] = val;
              enc[name] = expected[name].map((v) => encodeURIComponent(v));
              $form.field(name, val);
            });
            expect($form.field()).toStrictEqual(expected);
            $form.submit((err, $, res, body) => {
              const qp = helper.qsparse(res.headers['post-data']);
              each(set, (val, name) => {
                expect(qp[name]).toStrictEqual(enc[name]);
              });
              resolve();
            });
          });
        });
      });
    });

    describe('複数値を受け付けない部品', () => {
      test('配列[value ...]をセット => 文字列化されてセットされる', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=default-jp]');
            const expected = $form.field();
            const set = {
              text: ['アアアアア', 'イイイイイ'],
              textarea: ['ウウウウウ', 'エエエエエ']
            };
            const enc = {};
            each(set, (val, name) => {
              expected[name] = String(val);
              enc[name] = encodeURIComponent(expected[name]);
              $form.field(name, val);
            });
            expect($form.field()).toStrictEqual(expected);
            $form.submit((err, $, res, body) => {
              const qp = helper.qsparse(res.headers['post-data']);
              each(set, (val, name) => {
                expect(qp[name]).toStrictEqual(enc[name]);
              });
              resolve();
            });
          });
        });
      });
    });

    describe('checkbox', () => {
      test('valueが存在しない => 何も変更しない', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=checkbox]');
            const expected = $form.field();
            $form.field('check3', () => 33);
            expect($form.field()).toStrictEqual(expected);
            resolve();
          });
        });
      });

      test('valueが存在する => 選択状態にする(元の選択状態は解除される)', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=multi-submit]');
            const expected = $form.field();
            expected.checkbox = ['ccc'];
            $form.field('checkbox', 'ccc');
            expect($form.field()).toStrictEqual(expected);
            expect($('input[name=checkbox][value=ccc]').attr('checked')).toStrictEqual('checked');
            resolve();
          });
        });
      });
    });

    describe('radio', () => {
      test('valueが存在しない => 何も変更しない', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=radio]');
            const expected = $form.field();
            $form.field('radio1', 'aaa');
            expect($form.field()).toStrictEqual(expected);
            resolve();
          });
        });
      });

      test('valueが存在する => 選択状態にする(元の選択状態は解除される)', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=radio]');
            const expected = $form.field();
            expected.radio1 = 'zzz';
            $form.field('radio1', 'zzz');
            expect($form.field()).toStrictEqual(expected);
            expect($('input[name=radio1][value=zzz]').attr('checked')).toStrictEqual('checked');
            resolve();
          });
        });
      });

      test('valueが配列 => 文字列にキャストされる(配列内に該当するvalueがあっても無視される)', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=radio]');
            const expected = $form.field();
            expected.radio1 = 'yyy';
            $form.field('radio1', ['xxx', 'yyy', 'zzz']);
            expect($form.field()).toStrictEqual(expected);
            resolve();
          });
        });
      });
    });
  });

  describe('nameが存在しない(onNotFoundによって分岐)', () => {
    test('指定なし => valueはセットされない', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=login]');
          const name = '__user';
          const expected = $form.field();
          $form.field(name, 'hoge');
          expect(name in $form.field()).toStrictEqual(false);
          expect($form.field()).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('append(value文字列) => 新規にname部品(hidden)が作成される', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=login]');
          const name = '__user';
          const value = 'hoge';
          const expected = $form.field();
          expected[name] = value;
          $form.field(name, value, 'append');
          expect($form.field()[name]).toStrictEqual(value);
          expect($form.field()).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('append(value配列) => 新規にname部品(checkbox)が作成される', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=login]');
          const name = '__user';
          const value = ['foo', 'bar', 'baz', 1, 2, 3];
          const expected = $form.field();
          expected[name] = value.map((v) => String(v));
          $form.field(name, value, 'append');
          expect($form.field()[name]).toStrictEqual(expected[name]);
          expect($form.field()).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('appendした要素に値をセット => 反映される', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=login]');
          const name = '__user';
          const expected = $form.field();
          expected[name] = 'ほげ';
          $form.field(name, 'hoge', 'append');
          $form.field(name, 'ほげ', 'append');
          expect($form.field()[name]).toStrictEqual(expected[name]);
          expect($form.field()).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('throw => 例外発生', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=login]');
          expect(() => $form.field('__user', 'hoge', 'throw')).toThrow(
            'Element named "__user" could not be found in this form'
          );
          resolve();
        });
      });
    });
  });

  describe('nameに連想配列を指定', () => {
    test('複数の値が一度に設定される', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=default-jp]');
          const set = {
            text: 'アイウエオ',
            checkbox: ['かきくけこ', 'さしすせそ'],
            radio: 'たちつてと',
            select: ['ははははは', 'へへへへへ'],
            textarea: 'マミムメモ'
          };
          const expected = assign($form.field(), set);
          $form.field(set);
          expect($form.field()).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('指定しない部品は変更されない', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=select]');
          const set = {
            single: '4'
          };
          const expected = assign($form.field(), set);
          $form.field(set);
          expect($form.field()).toStrictEqual(expected);
          resolve();
        });
      });
    });

    describe('連想配列のnameが存在しない(onNotFoundによって分岐)', () => {
      const set = {
        password: 'bar',
        message: 'hello world!',
        custom_string: 'foo',
        custom_array: ['aaa', 'bbb', 'ccc']
      };

      test('指定なし => valueはセットされない', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=login]');
            const expected = $form.field();
            $form.field(set);
            const notfounds = [];
            each(set, (val, name) => {
              if (name in expected) {
                expected[name] = val;
              } else {
                notfounds.push(name);
              }
            });
            each(notfounds, (val) => {
              expect(typeOf($form.field('val'))).toStrictEqual('undefined');
            });
            expect($form.field()).toStrictEqual(expected);
            resolve();
          });
        });
      });

      test('append => 新規にname部品(hidden/checkbox)が作成される', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=login]');
            $form.field(set, 'append');
            const expected = assign($form.field(), set);
            expect($form.field()).toStrictEqual(expected);
            expect($form.find('[name=custom_string]').attr('type')).toStrictEqual('hidden');
            expect($form.find('[name=custom_array]').attr('type')).toStrictEqual('checkbox');
            resolve();
          });
        });
      });

      test('appendした要素に値をセット => 反映される', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=login]');
            $form.field(set, 'append');
            const set2 = {
              custom_string: 'んんんんん',
              custom_array: 'ccc'
            };
            const expected = assign($form.field(), set, set2);
            expected.custom_array = [expected.custom_array];
            $form.field(set2);
            expect($form.field()).toStrictEqual(expected);
            resolve();
          });
        });
      });

      test('throw => 例外発生', () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
            const $form = $('form[name=login]');
            expect(() => $form.field(set, 'throw')).toThrow(
              'Element named "custom_string" could not be found in this form'
            );
            resolve();
          });
        });
      });
    });
  });

  describe('値セット系はメソッドチェーン可能', () => {
    test('単一値', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=login]');
          const expected = assign($form.field(), {
            user: 'foobar',
            password: 'hogefuga'
          });
          $form.field('user', expected.user).field('password', expected.password);
          expect($form.field()).toStrictEqual(expected);
          resolve();
        });
      });
    });

    test('連想配列', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const set1 = {
            password: 'bar',
            custom_string: 'foo'
          };
          const set2 = {
            message: 'hello world!',
            custom_array: ['aaa', 'bbb', 'ccc']
          };
          const $form = $('form[name=login]');
          const expected = assign($form.field(), set1, set2);
          delete expected.custom_string;
          $form.field(set1).field(set2, 'append');
          expect($form.field()).toStrictEqual(expected);
          resolve();
        });
      });
    });
  });
});

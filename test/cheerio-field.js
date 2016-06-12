/*eslint-env mocha*/
/*eslint no-invalid-this:0, no-undefined:0, max-len:[1, 150, 2], max-nested-callbacks:[1, 6]*/
/*jshint -W100*/
var assert = require('power-assert');
var typeOf = require('type-of');
var assign = require('object-assign');
var each   = require('foreach');
var helper = require('./_helper');
var cli    = require('../index');

describe('cheerio:field', function () {
  describe('根本的エラー', function () {
    it('form要素以外 => element is not form', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        try {
          $('div').eq(0).field('user');
          throw new Error('not thrown');
        } catch (e) {
          assert(e.message === 'element is not form');
        }
        done();
      });
    });

    it('要素数0 => no elements', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        try {
          $('header').field('user', 'hoge');
          throw new Error('not thrown');
        } catch (e) {
          assert(e.message === 'no elements');
        }
        done();
      });
    });

    it('nameが指定されているが文字列でない => name is not string or object', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        try {
          $('form[name=login]').field([ 1, 2, 3 ]);
          throw new Error('not thrown');
        } catch (e) {
          assert(e.message === 'name is not string or object');
        }
        done();
      });
    });
  });

  describe('nameのみ指定(設定値取得)', function () {
    it('nameのみ指定 => form配下のname部品の値を取得', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var actual = $('form[name=login]').field('user');
        assert(actual === 'guest');
        done();
      });
    });

    it('nameのみの指定でname部品がform内にない => undefined', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var actual = $('form[name=login]').field('user');
        assert(actual === 'guest');
        done();
      });
    });

    describe('select', function () {
      it('not multiple => 選択値の文字列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=select]');
          var expected = $form.find('select[name=single]').val();
          var actual = $form.field('single');
          assert(actual === expected);
          done();
        });
      });

      it('multiple(選択) => 選択値の配列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=select]');
          var expected = $form.find('select[name=multi]').val();
          var actual = $form.field('multi');
          assert.deepEqual(actual, expected);
          done();
        });
      });

      it('multiple(未選択) => 空配列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=select]');
          $form.find('select[name=multi]').val([]);
          var actual = $form.field('multi');
          assert(typeOf(actual) === 'array');
          assert(actual.length === 0);
          done();
        });
      });
    });

    describe('checkbox', function () {
      it('同名なし(選択) => 選択値の文字列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=checkbox]');
          var actual = $form.field('check1');
          assert(actual === '1');
          done();
        });
      });

      it('同名なし(未選択) => undefinedを返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=checkbox]');
          var actual = $form.field('check2');
          assert(typeOf(actual) === 'undefined');
          done();
        });
      });

      it('同名複数 => 選択値の配列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=checkbox]');
          $form.find('[name="check4[]"]').eq(1).tick();
          var actual = $form.field('check4[]');
          assert.deepEqual(actual, [ 'かきくけこ' ]);
          done();
        });
      });

      it('同名複数(未選択) => 空配列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=checkbox]');
          var actual = $form.field('check4[]');
          assert(typeOf(actual) === 'array');
          assert(actual.length === 0);
          done();
        });
      });
    });
  });

  describe('引数なし', function () {
    it('フォームの全部品とその状態を連想配列で返す', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=default-jp]');
        var expected = {
          text: 'あいうえお',
          checkbox: [ 'かきくけこ' ],
          radio: 'なにぬねの',
          select: [ 'ふふふふふ', 'ほほほほほ' ],
          textarea: 'まみむめも'
        };
        var actual = $form.field();
        assert.deepEqual(actual, expected);
        done();
      });
    });

    it('submit系要素 => 除外される', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=multi-submit]');
        var expected = {
          text: 'あいうえお',
          checkbox: [ 'bbb' ]
        };
        var actual = $form.field();
        assert.deepEqual(actual, expected);
        done();
      });
    });
  });

  describe('name,valueを指定(nameにvalueをセット)', function () {
    var types = {
      string: 'hey',
      array: [ 1, 2, 3 ],
      object: { x: 1, y: 2, z: 3 },
      number: 12,
      functino: function () {
        return 'hello';
      },
      date: new Date('2015/12/31 23:59:59'),
      regexp: /asdf/,
      null: null,
      undefined: undefined,
      true: true,
      false: false
    };
    each(types, function (val, type) {
      it('cheerioで直接セットしたのと同じ状態になる(' + type + ')', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=default-jp]');
          var $text = $form.find('input[name=text]');
          $text.val(val);
          var expected = $text.val();
          $form.field('text', val);
          var actual = $form.field('text');
          assert(actual === expected);
          done();
        });
      });
    });

    describe('複数値を受け付ける部品', function () {
      it('文字列valueをセット => name部品に配列[value]をセット', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=default-jp]');
          var expected = $form.field();
          var set = {
            checkbox: 'さしすせそ',
            select: 'ひひひひひ'
          };
          var enc = {};
          each(set, function (val, name) {
            expected[name] = [ val ];
            enc[name] = encodeURIComponent(val);
            $form.field(name, val);
          });
          assert.deepEqual($form.field(), expected);
          $form.submit(function (err, $, res, body) {
            var qp = helper.qsparse(res.headers['post-data']);
            each(set, function (val, name) {
              assert.deepEqual(qp[name], enc[name]);
            });
            done();
          });
        });
      });

      it('配列[value ...]をセット => 配列のままセットされる', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=default-jp]');
          var expected = $form.field();
          var set = {
            checkbox: [ 'かきくけこ', 'さしすせそ' ],
            select: [ 'ははははは', 'ひひひひひ' ]
          };
          var enc = {};
          each(set, function (val, name) {
            expected[name] = val;
            enc[name] = expected[name].map(function (v) {
              return encodeURIComponent(v);
            });
            $form.field(name, val);
          });
          assert.deepEqual($form.field(), expected);
          $form.submit(function (err, $, res, body) {
            var qp = helper.qsparse(res.headers['post-data']);
            each(set, function (val, name) {
              assert.deepEqual(qp[name], enc[name]);
            });
            done();
          });
        });
      });
    });

    describe('複数値を受け付けない部品', function () {
      it('配列[value ...]をセット => 文字列化されてセットされる', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=default-jp]');
          var expected = $form.field();
          var set = {
            text: [ 'アアアアア', 'イイイイイ' ],
            textarea: [ 'ウウウウウ', 'エエエエエ' ]
          };
          var enc = {};
          each(set, function (val, name) {
            expected[name] = String(val);
            enc[name] = encodeURIComponent(expected[name]);
            $form.field(name, val);
          });
          assert.deepEqual($form.field(), expected);
          $form.submit(function (err, $, res, body) {
            var qp = helper.qsparse(res.headers['post-data']);
            each(set, function (val, name) {
              assert.deepEqual(qp[name], enc[name]);
            });
            done();
          });
        });
      });
    });

    describe('checkbox', function () {
      it('valueが存在しない => 何も変更しない', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=checkbox]');
          var expected = $form.field();
          $form.field('check3', function () {
            return '33';
          });
          assert.deepEqual($form.field(), expected);
          done();
        });
      });

      it('valueが存在する => 選択状態にする(元の選択状態は解除される)', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=multi-submit]');
          var expected = $form.field();
          expected.checkbox = [ 'ccc' ];
          $form.field('checkbox', 'ccc');
          assert.deepEqual($form.field(), expected);
          assert($('input[name=checkbox][value=ccc]').attr('checked') === 'checked');
          done();
        });
      });
    });

    describe('radio', function () {
      it('valueが存在しない => 何も変更しない', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=radio]');
          var expected = $form.field();
          $form.field('radio1', 'aaa');
          assert.deepEqual($form.field(), expected);
          done();
        });
      });

      it('valueが存在する => 選択状態にする(元の選択状態は解除される)', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=radio]');
          var expected = $form.field();
          expected.radio1 = 'zzz';
          $form.field('radio1', 'zzz');
          assert.deepEqual($form.field(), expected);
          assert($('input[name=radio1][value=zzz]').attr('checked') === 'checked');
          done();
        });
      });

      it('valueが配列 => 文字列にキャストされる(配列内に該当するvalueがあっても無視される)', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var $form = $('form[name=radio]');
          var expected = $form.field();
          expected.radio1 = 'yyy';
          $form.field('radio1', [ 'xxx', 'yyy', 'zzz' ]);
          assert.deepEqual($form.field(), expected);
          done();
        });
      });
    });
  });

  describe('nameが存在しない(onNotFoundによって分岐)', function () {
    it('指定なし => valueはセットされない', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=login]');
        var name = '__user';
        var expected = $form.field();
        $form.field(name, 'hoge');
        assert(name in $form.field() === false);
        assert.deepEqual($form.field(), expected);
        done();
      });
    });

    it('append(value文字列) => 新規にname部品(hidden)が作成される', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=login]');
        var name = '__user';
        var value = 'hoge';
        var expected = $form.field();
        expected[name] = value;
        $form.field(name, value, 'append');
        assert($form.field()[name] === value);
        assert.deepEqual($form.field(), expected);
        done();
      });
    });

    it('append(value配列) => 新規にname部品(checkbox)が作成される', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=login]');
        var name = '__user';
        var value = [ 'foo', 'bar', 'baz', 1, 2, 3 ];
        var expected = $form.field();
        expected[name] = value.map(function (v) {
          return String(v);
        });
        $form.field(name, value, 'append');
        assert.deepEqual($form.field()[name], expected[name]);
        assert.deepEqual($form.field(), expected);
        done();
      });
    });

    it('appendした要素に値をセット => 反映される', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=login]');
        var name = '__user';
        var expected = $form.field();
        expected[name] = 'ほげ';
        $form.field(name, 'hoge', 'append');
        $form.field(name, 'ほげ', 'append');
        assert.deepEqual($form.field()[name], expected[name]);
        assert.deepEqual($form.field(), expected);
        done();
      });
    });

    it('throw => 例外発生', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=login]');
        try {
          $form.field('__user', 'hoge', 'throw');
          throw new Error('not thrown');
        } catch (e) {
          assert(e.message === 'Element named "__user" could not be found in this form');
        }
        done();
      });
    });
  });

  describe('nameに連想配列を指定', function () {
    it('複数の値が一度に設定される', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=default-jp]');
        var set = {
          text: 'アイウエオ',
          checkbox: [ 'かきくけこ', 'さしすせそ' ],
          radio: 'たちつてと',
          select: [ 'ははははは', 'へへへへへ' ],
          textarea: 'マミムメモ'
        };
        var expected = assign($form.field(), set);
        $form.field(set);
        assert.deepEqual($form.field(), expected);
        done();
      });
    });

    it('指定しない部品は変更されない', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=select]');
        var set = {
          single: '4'
        };
        var expected = assign($form.field(), set);
        $form.field(set);
        assert.deepEqual($form.field(), expected);
        done();
      });
    });

    describe('連想配列のnameが存在しない(onNotFoundによって分岐)', function () {
      before(function () {
        this.set = {
          password: 'bar',
          message: 'hello world!',
          custom_string: 'foo',
          custom_array: [ 'aaa', 'bbb', 'ccc' ]
        };
      });

      it('指定なし => valueはセットされない', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), (function (err, $, res, body) {
          var $form = $('form[name=login]');
          var expected = $form.field();
          $form.field(this.set);
          var notfounds = [];
          each(this.set, function (val, name) {
            if (name in expected) {
              expected[name] = val;
            } else {
              notfounds.push(name);
            }
          });
          each(notfounds, function (val) {
            assert(typeOf($form.field('val')) === 'undefined');
          });
          assert.deepEqual($form.field(), expected);
          done();
        }).bind(this));
      });

      it('append => 新規にname部品(hidden/checkbox)が作成される', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), (function (err, $, res, body) {
          var $form = $('form[name=login]');
          $form.field(this.set, 'append');
          var expected = assign($form.field(), this.set);
          assert.deepEqual($form.field(), expected);
          assert($form.find('[name=custom_string]').attr('type') === 'hidden');
          assert($form.find('[name=custom_array]').attr('type') === 'checkbox');
          done();
        }).bind(this));
      });

      it('appendした要素に値をセット => 反映される', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), (function (err, $, res, body) {
          var $form = $('form[name=login]');
          $form.field(this.set, 'append');
          var set2 = {
            custom_string: 'んんんんん',
            custom_array: 'ccc'
          };
          var expected = assign($form.field(), this.set, set2);
          expected.custom_array = [ expected.custom_array ];
          $form.field(set2);
          assert.deepEqual($form.field(), expected);
          done();
        }).bind(this));
      });

      it('throw => 例外発生', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), (function (err, $, res, body) {
          var $form = $('form[name=login]');
          try {
            $form.field(this.set, 'throw');
            throw new Error('not thrown');
          } catch (e) {
            assert(e.message === 'Element named "custom_string" could not be found in this form');
          }
          done();
        }).bind(this));
      });
    });
  });

  describe('値セット系はメソッドチェーン可能', function () {
    it('単一値', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=login]');
        var expected = assign($form.field(), {
          user: 'foobar',
          password: 'hogefuga'
        });
        $form.field('user', expected.user).field('password', expected.password);
        assert.deepEqual($form.field(), expected);
        done();
      });
    });

    it('連想配列', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var set1 = {
          password: 'bar',
          custom_string: 'foo'
        };
        var set2 = {
          message: 'hello world!',
          custom_array: [ 'aaa', 'bbb', 'ccc' ]
        };
        var $form = $('form[name=login]');
        var expected = assign($form.field(), set1, set2);
        delete expected.custom_string;
        $form.field(set1).field(set2, 'append');
        assert.deepEqual($form.field(), expected);
        done();
      });
    });
  });
});

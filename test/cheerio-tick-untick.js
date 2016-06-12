/*eslint-env mocha*/
/*eslint no-invalid-this:0, max-len:[1, 150, 2], max-nested-callbacks:[1, 6]*/
/*jshint -W100*/
var assert = require('power-assert');
var typeOf = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('cheerio:tick', function () {
  describe('input[type=checkbox]要素', function () {
    it('input[type=checkbox]要素以外 => 例外発生', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        try {
          $('input[type=text]').eq(0).tick();
          throw new Error('not thrown');
        } catch (e) {
          assert(e.message === 'element is not checkbox or radio');
        }
        done();
      });
    });

    it('要素数0 => 例外発生', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        try {
          $('input[name=not_found]').tick();
          throw new Error('not thrown');
        } catch (e) {
          assert(e.message === 'no elements');
        }
        done();
      });
    });

    it('すでに選択済みのcheckbox => 変化なし', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=checkbox]');
        var $checkbox = $form.find('input[name=check1]');
        var state = $checkbox.attr('checked');
        assert(state === 'checked');
        $checkbox.tick();
        assert($checkbox.attr('checked') === state);
        $form.find('input[type=submit]').click(function (err, $, res, body) {
          var param = '?check1=1&check2=&check3=&check4%5B%5D=';
          assert($.documentInfo().url === helper.url('~info') + param);
          var h = res.headers;
          assert(h['request-url'] === '/~info' + param);
          assert(h['request-method'] === 'GET');
          assert(! h['post-data']);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('未選択のcheckbox => 選択状態になる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=checkbox]');
        var $checkbox = $form.find('input[name=check2]');
        var state = $checkbox.attr('checked');
        assert(typeOf(state) === 'undefined');
        $checkbox.tick();
        assert($checkbox.attr('checked') === 'checked');
        $form.submit(function (err, $, res, body) {
          var param = '?check1=1&check2=2&check3=&check4%5B%5D=';
          assert($.documentInfo().url === helper.url('~info') + param);
          var h = res.headers;
          assert(h['request-url'] === '/~info' + param);
          assert(h['request-method'] === 'GET');
          assert(! h['post-data']);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('複数要素 => 要素すべてが選択状態になる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=checkbox]');
        var $checkboxes = $form.find('input[type=checkbox]');
        $checkboxes.tick().each(function (i) {
          assert($(this).attr('checked') === 'checked');
        });
        $form.submit(function (err, $, res, body) {
          var param = '?' + [
            [ 'check1', 1 ],
            [ 'check2', 2 ],
            [ 'check3', 3 ],
            [ 'check3', 4 ],
            [ 'check3', 5 ],
            [ 'check4[]', 'あいうえお' ],
            [ 'check4[]', 'かきくけこ' ],
            [ 'check4[]', 'さしすせそ' ]
          ].map(function (v, i, a) {
            return encodeURIComponent(v[0]) + '=' + encodeURIComponent(v[1]);
          }).join('&');
          assert($.documentInfo().url === helper.url('~info') + param);
          var h = res.headers;
          assert(h['request-url'] === '/~info' + param);
          assert(h['request-method'] === 'GET');
          assert(! h['post-data']);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });
  });

  describe('input[type=radio]要素', function () {
    it('グループが未選択 => radioを選択状態にする', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=radio]');
        var $before = $form.find('input[name=radio2]:checked');
        assert($before.length === 0);
        assert(typeOf($before.val()) === 'undefined');
        $form.find('input[name=radio2]').eq(0).tick();
        var $after = $form.find('input[name=radio2]:checked');
        assert($after.length === 1);
        assert($after.val() === 'あいうえお');
        $form.find('input[type=submit]').click(function (err, $, res, body) {
          var param = 'radio1=yyy&radio2=' + encodeURIComponent('あいうえお');
          assert($.documentInfo().url === helper.url('~info'));
          var h = res.headers;
          assert(h['request-url'] === '/~info');
          assert(h['request-method'] === 'POST');
          assert(h['post-data'] === param);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('すでに選択されているradio => 変化なし', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=radio]');
        var $before = $form.find('input[name=radio1]:checked');
        assert($before.length === 1);
        assert($before.val() === 'yyy');
        $before.tick();
        var $after = $form.find('input[name=radio1]:checked');
        assert($after.length === 1);
        assert($after.val() === 'yyy');
        $form.find('input[type=submit]').click(function (err, $, res, body) {
          var param = 'radio1=yyy&radio2=';
          assert($.documentInfo().url === helper.url('~info'));
          var h = res.headers;
          assert(h['request-url'] === '/~info');
          assert(h['request-method'] === 'POST');
          assert(h['post-data'] === param);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('グループ内ですでに選択されている別のradioがある => その選択状態を解除して指定されたradioを選択状態にする', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=radio]');
        var $before = $form.find('input[name=radio1]:checked');
        assert($before.length === 1);
        assert($before.val() === 'yyy');
        $before.next().tick();
        var $after = $form.find('input[name=radio1]:checked');
        assert($after.length === 1);
        assert($after.val() === 'zzz');
        $form.find('input[type=submit]').click(function (err, $, res, body) {
          var param = 'radio1=zzz&radio2=';
          assert($.documentInfo().url === helper.url('~info'));
          var h = res.headers;
          assert(h['request-url'] === '/~info');
          assert(h['request-method'] === 'POST');
          assert(h['post-data'] === param);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('複数要素 => 先頭の要素のみが選択状態になる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=radio]');
        var $before = $form.find('input[name=radio1]:checked');
        assert($before.length === 1);
        assert($before.val() === 'yyy');
        $form.find('input[name=radio1]').tick();
        var $after = $form.find('input[name=radio1]:checked');
        assert($after.length === 1);
        assert($after.val() === 'xxx');
        $form.find('input[type=submit]').click(function (err, $, res, body) {
          var param = 'radio1=xxx&radio2=';
          assert($.documentInfo().url === helper.url('~info'));
          var h = res.headers;
          assert(h['request-url'] === '/~info');
          assert(h['request-method'] === 'POST');
          assert(h['post-data'] === param);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });
  });

  describe('input[type=checkbox]要素とinput[type=radio]要素の複合', function () {
    it('checkboxとradioが混在した複数要素 => checkboxは指定した全要素を選択、radioは先頭の要素のみが選択状態になる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=default-jp]');
        $form.find('input[type=checkbox],input[type=radio]').tick();
        assert($form.find('input[type=checkbox]:checked').length === $form.find('input[type=checkbox]').length);
        var $radio = $form.find('input[type=radio]:checked');
        assert($radio.length === 1);
        assert($radio.val() === 'たちつてと');
        $form.find('textarea').val('やゆよ');
        $form.submit(function (err, $, res, body) {
          var qp = helper.qsparse(res.headers['post-data']);
          assert.deepEqual(Object.keys(qp).sort(), [
            'checkbox', 'radio', 'select', 'text', 'textarea'
          ]);
          assert(qp.text === encodeURIComponent('あいうえお'));
          assert.deepEqual(qp.checkbox, [
            encodeURIComponent('かきくけこ'),
            encodeURIComponent('さしすせそ')
          ]);
          assert(qp.radio === encodeURIComponent('たちつてと'));
          assert.deepEqual(qp.select, [
            encodeURIComponent('ふふふふふ'),
            encodeURIComponent('ほほほほほ')
          ]);
          assert(qp.textarea === encodeURIComponent('やゆよ'));
          done();
        });
      });
    });
  });
});

describe('cheerio:untick', function () {
  describe('input[type=checkbox]要素', function () {
    it('input[type=checkbox]要素以外 => 例外発生', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        try {
          $('input[type=text]').eq(0).untick();
          throw new Error('not thrown');
        } catch (e) {
          assert(e.message === 'element is not checkbox or radio');
        }
        done();
      });
    });

    it('要素数0 => 例外発生', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        try {
          $('input[name=not_found]').untick();
          throw new Error('not thrown');
        } catch (e) {
          assert(e.message === 'no elements');
        }
        done();
      });
    });

    it('未選択状態のcheckbox => 変化なし', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=checkbox]');
        var $checkbox = $form.find('input[name=check2]');
        var state = $checkbox.attr('checked');
        assert(typeOf(state) === 'undefined');
        $checkbox.untick();
        assert($checkbox.attr('checked') === state);
        $form.find('input[type=submit]').click(function (err, $, res, body) {
          var param = '?check1=1&check2=&check3=&check4%5B%5D=';
          assert($.documentInfo().url === helper.url('~info') + param);
          var h = res.headers;
          assert(h['request-url'] === '/~info' + param);
          assert(h['request-method'] === 'GET');
          assert(! h['post-data']);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('選択状態のcheckbox => 未選択状態になる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=checkbox]');
        var $checkbox = $form.find('input[name=check1]');
        var state = $checkbox.attr('checked');
        assert(state === 'checked');
        $checkbox.untick();
        assert(typeOf($checkbox.attr('checked')) === 'undefined');
        $form.submit(function (err, $, res, body) {
          var param = '?check1=&check2=&check3=&check4%5B%5D=';
          assert($.documentInfo().url === helper.url('~info') + param);
          var h = res.headers;
          assert(h['request-url'] === '/~info' + param);
          assert(h['request-method'] === 'GET');
          assert(! h['post-data']);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('複数要素 => 要素すべてが未選択状態になる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=checkbox]');
        var $checkboxes = $form.find('input[type=checkbox]');
        $checkboxes.untick().each(function (i) {
          assert(typeOf($(this).attr('checked')) === 'undefined');
        });
        $form.submit(function (err, $, res, body) {
          var param = '?check1=&check2=&check3=&check4%5B%5D=';
          assert($.documentInfo().url === helper.url('~info') + param);
          var h = res.headers;
          assert(h['request-url'] === '/~info' + param);
          assert(h['request-method'] === 'GET');
          assert(! h['post-data']);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });
  });

  describe('input[type=radio]要素', function () {
    it('グループが未選択状態 => 変化なし', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=radio]');
        var $before = $form.find('input[name=radio2]:checked');
        assert($before.length === 0);
        assert(typeOf($before.val()) === 'undefined');
        $form.find('input[name=radio2]').eq(0).untick();
        var $after = $form.find('input[name=radio2]:checked');
        assert($after.length === 0);
        assert(typeOf($after.val()) === 'undefined');
        $form.find('input[type=submit]').click(function (err, $, res, body) {
          var param = 'radio1=yyy&radio2=';
          assert($.documentInfo().url === helper.url('~info'));
          var h = res.headers;
          assert(h['request-url'] === '/~info');
          assert(h['request-method'] === 'POST');
          assert(h['post-data'] === param);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('選択状態のradio => 選択状態を解除する', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=radio]');
        var $before = $form.find('input[name=radio1]:checked');
        assert($before.length === 1);
        assert($before.val() === 'yyy');
        $before.untick();
        var $after = $form.find('input[name=radio1]:checked');
        assert($after.length === 0);
        assert(typeOf($after.val()) === 'undefined');
        $form.find('input[type=submit]').click(function (err, $, res, body) {
          var param = 'radio1=&radio2=';
          assert($.documentInfo().url === helper.url('~info'));
          var h = res.headers;
          assert(h['request-url'] === '/~info');
          assert(h['request-method'] === 'POST');
          assert(h['post-data'] === param);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('未選択状態のradio => 変化なし(選択状態のradioもそのまま)', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=radio]');
        var $before = $form.find('input[name=radio1]:checked');
        assert($before.length === 1);
        assert($before.val() === 'yyy');
        $before.prev().untick();
        var $after = $form.find('input[name=radio1]:checked');
        assert($after.length === 1);
        assert($before.val() === 'yyy');
        $form.find('input[type=submit]').click(function (err, $, res, body) {
          var param = 'radio1=yyy&radio2=';
          assert($.documentInfo().url === helper.url('~info'));
          var h = res.headers;
          assert(h['request-url'] === '/~info');
          assert(h['request-method'] === 'POST');
          assert(h['post-data'] === param);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('複数要素 => 要素すべてが未選択状態になる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=radio]');
        var $before = $form.find('input[name=radio1]:checked');
        assert($before.length === 1);
        assert($before.val() === 'yyy');
        $form.find('input[name=radio1]').untick();
        var $after = $form.find('input[name=radio1]:checked');
        assert($after.length === 0);
        assert(typeOf($after.val()) === 'undefined');
        $form.find('input[type=submit]').click(function (err, $, res, body) {
          var param = 'radio1=&radio2=';
          assert($.documentInfo().url === helper.url('~info'));
          var h = res.headers;
          assert(h['request-url'] === '/~info');
          assert(h['request-method'] === 'POST');
          assert(h['post-data'] === param);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });
  });

  describe('input[type=checkbox]要素とinput[type=radio]要素の複合', function () {
    it('checkboxとradioが混在した複数要素 => checkboxもradioも指定した全要素の選択状態が解除される', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=default-jp]');
        $form.find('input[type=checkbox],input[type=radio]').untick();
        assert($form.find('input[type=checkbox]:checked').length === 0);
        assert($form.find('input[type=radio]:checked').length === 0);
        $form.find('select').val('ふふふふふ');
        $form.submit(function (err, $, res, body) {
          var qp = helper.qsparse(res.headers['post-data']);
          assert.deepEqual(Object.keys(qp).sort(), [
            'checkbox', 'radio', 'select', 'text', 'textarea'
          ]);
          assert(qp.text === encodeURIComponent('あいうえお'));
          assert(qp.checkbox === '');
          assert(qp.radio === '');
          assert(qp.select === encodeURIComponent('ふふふふふ'));
          assert(qp.textarea === encodeURIComponent('まみむめも'));
          done();
        });
      });
    });
  });
});

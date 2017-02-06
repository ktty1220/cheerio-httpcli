/*eslint-env mocha*/
/*eslint no-invalid-this:0, no-undefined:0, max-len:[1, 150, 2], max-nested-callbacks:[1, 6]*/
/*jscs:disable requireDotNotation*/
/*jshint -W100*/
var assert = require('power-assert');
var typeOf = require('type-of');
var each   = require('foreach');
var helper = require('./_helper');
var cli    = require('../index');

describe('cheerio:submit', function () {
  it('form要素以外 => エラー', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('div').eq(0).submit({ hoge: 'fuga' }, function (err, $, res, body) {
        assert(err.message === 'element is not form');
        assert(! $);
        assert(! res);
        assert(! body);
        done();
      });
    });
  });

  it('要素数0 => エラー', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('header').submit({ hoge: 'fuga' }, function (err, $, res, body) {
        assert(err.message === 'no elements');
        assert(! $);
        assert(! res);
        assert(! body);
        done();
      });
    });
  });

  it('form要素のaction, method属性でフォームが送信される(GET)', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=get]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info') + '?hoge=fuga');
        var h = res.headers;
        assert(h['request-url'] === '/~info?hoge=fuga');
        assert(h['request-method'] === 'GET');
        assert(! h['post-data']);
        assert(typeOf($) === 'function');
        assert(typeOf(body) === 'string');
        done();
      });
    });
  });

  it('form要素のaction, method属性でフォームが送信される(POST)', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=post]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'hoge=fuga');
        assert(typeOf($) === 'function');
        assert(typeOf(body) === 'string');
        done();
      });
    });
  });

  it('form要素のmethod属性がない => GETでフォームが送信される', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name="no-method"]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info') + '?hoge=fuga');
        var h = res.headers;
        assert(h['request-url'] === '/~info?hoge=fuga');
        assert(h['request-method'] === 'GET');
        assert(! h['post-data']);
        assert(typeOf($) === 'function');
        assert(typeOf(body) === 'string');
        done();
      });
    });
  });

  it('form要素のaction属性もmethod属性もない => GETかつ現ページに対してフォームが送信される', function (done) {
    var url = helper.url('form', 'utf-8');
    cli.fetch(url, function (err, $, res, body) {
      $('form[name="no-action-no-method"]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === url + '?hoge=fuga');
        assert(typeOf($) === 'function');
        assert(typeOf(body) === 'string');
        done();
      });
    });
  });

  it('select要素を含んだフォームのselectedがフォーム送信パラメータのデフォルトになっている', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=select]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'single=2&multi=3&multi=5');
        assert(typeOf($) === 'function');
        assert(typeOf(body) === 'string');
        done();
      });
    });
  });

  it('checkbox要素を含んだフォームのcheckedがフォーム送信パラメータのデフォルトになっている', function (done) {
    var param = '?check1=1&check2=&check3=&check4%5B%5D=';
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=checkbox]').submit(function (err, $, res, body) {
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

  it('radio要素を含んだフォームのcheckedがフォーム送信パラメータのデフォルトになっている', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=radio]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'radio1=yyy&radio2=');
        assert(typeOf($) === 'function');
        assert(typeOf(body) === 'string');
        done();
      });
    });
  });

  it('input[type=submit]とinput[type=image]はパラメータに含まれない', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name="multi-submit"]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'text=%E3%81%82%E3%81%84%E3%81%86%E3%81%88%E3%81%8A&checkbox=bbb');
        assert(typeOf($) === 'function');
        assert(typeOf(body) === 'string');
        done();
      });
    });
  });

  it('input要素のvalueがない => 空文字となる', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=no-input-value]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'hoge=');
        assert(typeOf($) === 'function');
        assert(typeOf(body) === 'string');
        done();
      });
    });
  });

  it('パラメータのvalueがnull/undefined/empty => "name="という形でURLに追加される', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=post]').submit({
        foo: null, bar: undefined, baz: ''
      }, function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'hoge=fuga&foo=&bar=&baz=');
        assert(typeOf($) === 'function');
        assert(typeOf(body) === 'string');
        done();
      });
    });
  });

  it('パラメータのvalueが数字の0 => "name=0"という形でURLに追加される', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=post]').submit({ hoge: 0 }, function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'hoge=0');
        assert(typeOf($) === 'function');
        assert(typeOf(body) === 'string');
        done();
      });
    });
  });

  each([ 0, 1, 2 ], function (idx) {
    it('生のform要素 => フォーム送信される(' + idx + '番目)', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        $($('.form-group form')[idx]).submit(function (err, $, res, body) {
          assert($.documentInfo().url === helper.url('~info') + '?hoge=fuga');
          var h = res.headers;
          assert(h['request-url'] === '/~info?hoge=fuga');
          assert(h['request-method'] === 'GET');
          assert(! h['post-data']);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });
  });

  it('無から作成したform要素(jQuery形式) => フォーム送信される', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var $form = $('<form/>').attr({
        method: 'GET',
        action: '/~info'
      })
      .append($('<input/>').attr({
        type: 'hidden',
        name: 'hoge',
        value: 'fuga'
      }))
      .append($('<input/>').attr({
        type: 'text',
        name: 'foo',
        value: 'あいうえお'
      }));

      $form.submit(function (err, $, res, body) {
        var param = 'hoge=fuga&foo=' + encodeURIComponent('あいうえお');
        assert($.documentInfo().url === helper.url('~info') + '?' + param);
        var h = res.headers;
        assert(h['request-url'] === '/~info?' + param);
        assert(h['request-method'] === 'GET');
        assert(! h['post-data']);
        assert(typeOf($) === 'function');
        assert(typeOf(body) === 'string');
        done();
      });
    });
  });

  it('無から作成したform要素(HTML形式) => フォーム送信される', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var $form = $([
        '<form method="POST" action="/~info">',
        '<input type="hidden" name="hoge" value="fuga" />',
        '<input type="text" name="foo" value="あいうえお" />',
        '</form>'
      ].join('\n'));
      $form.submit({ foo: 'かきくけこ' }, function (err, $, res, body) {
        var param = 'hoge=fuga&foo=' + encodeURIComponent('かきくけこ');
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

  var escapes = helper.escapedParam();
  each(helper.files('form'), function (enc) {
    describe('cheerio:submit(' + enc + ')', function () {
      it('デフォルトパラメータが日本語 => ページのエンコーディングに合わせたURLエンコードで送信される', function (done) {
        cli.fetch(helper.url('form', enc), function (err, $, res, body) {
          $('form[name=default-jp]').submit(function (err, $, res, body) {
            var qp = helper.qsparse(res.headers['post-data']);
            assert.deepEqual(Object.keys(qp).sort(), [
              'checkbox', 'radio', 'select', 'text', 'textarea'
            ]);
            assert(qp.text === escapes['あいうえお'][enc]);
            assert(qp.checkbox === escapes['かきくけこ'][enc]);
            assert(qp.radio === escapes['なにぬねの'][enc]);
            assert.deepEqual(qp.select, [ escapes['ふふふふふ'][enc], escapes['ほほほほほ'][enc] ]);
            assert(qp.textarea === escapes['まみむめも'][enc]);
            done();
          });
        });
      });

      it('上書きパラメータが日本語 => ページのエンコーディングに合わせたURLエンコードで送信される', function (done) {
        var set = {
          text: 'かきくけこ',
          checkbox: null,
          radio: 'たちつてと',
          select: [ 'ははははは', 'へへへへへ' ],
          textarea: ''
        };
        cli.fetch(helper.url('form', enc), function (err, $, res, body) {
          $('form[name=default-jp]').submit(set, function (err, $, res, body) {
            var qp = helper.qsparse(res.headers['post-data']);
            assert.deepEqual(Object.keys(qp).sort(), [
              'checkbox', 'radio', 'select', 'text', 'textarea'
            ]);
            assert(qp.text === escapes['かきくけこ'][enc]);
            assert(qp.checkbox === '');
            assert(qp.radio === escapes['たちつてと'][enc]);
            assert.deepEqual(qp.select, [ escapes['ははははは'][enc], escapes['へへへへへ'][enc] ]);
            assert(qp.textarea === '');
            done();
          });
        });
      });

      /*jscs:disable disallowQuotedKeysInObjects*/
      /*eslint-disable quote-props*/
      var expectedEncodings = {
        'shift_jis': 'utf-8',
        'euc-jp': 'shift_jis',
        'utf-8': 'euc-jp'
      };
      /*jscs:enable disallowQuotedKeysInObjects*/
      /*eslint-enable quote-props*/
      it('accept-chaset属性あり => accept-charsetで指定されたURLエンコードで送信される(' + expectedEncodings[enc] + ')', function () {
        var param = { q: 'かきくけこ' };
        return cli.fetch(helper.url('form', enc))
        .then(function (result1) {
          return result1.$('form[name=charset]').submit(param);
        })
        .then(function (result2) {
          var actual = result2.response.headers['request-url'];
          var expected = '/~info?q=' + escapes[param.q][expectedEncodings[enc]];
          assert(actual === expected);
        });
      });
    });
  });
});

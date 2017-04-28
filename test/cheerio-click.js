/*eslint-env mocha*/
/*eslint no-invalid-this:0, max-len:[1, 150, 2], max-nested-callbacks:[1, 6]*/
/*jshint -W100*/
var assert = require('power-assert');
var typeOf = require('type-of');
var each   = require('foreach');
var helper = require('./_helper');
var cli    = require('../index');

describe('cheerio:click', function () {
  describe('対応している要素以外 => エラー', function () {
    each([
      'html',
      'body',
      'div',
      'form',
      'textarea',
      'input[type=reset]',
      'input[type=checkbox]',
      'input[type=radio]',
      'select'
    ], function (elem) {
      it(elem, function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          $(elem).eq(0).click(function (err, $, res, body) {
            assert(err.message === 'element is not clickable');
            assert(! res);
            assert(! $);
            assert(! body);
            done();
          });
        });
      });
    });
  });

  describe('要素数0 => エラー', function () {
    each([
      'header',
      'p',
      'span',
      'input[type=button]'
    ], function (elem) {
      it(elem, function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          $(elem).click(function (err, $, res, body) {
            assert(err.message === 'no elements');
            assert(! res);
            assert(! $);
            assert(! body);
            done();
          });
        });
      });
    });
  });

  describe('a要素', function () {
    it('相対パスリンク => 現在のページを基準にしたリンク先を取得する', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        $('.rel').click(function (err, $, res, body) {
          assert.deepEqual($.documentInfo(), {
            url: helper.url('auto', 'euc-jp'),
            encoding: 'euc-jp',
            isXml: false
          });
          assert(typeOf(res) === 'object');
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('外部URLリンク => そのURLのリンク先を取得する', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        $('.external').click(function (err, $, res, body) {
          assert.deepEqual($.documentInfo(), {
            url: 'https://www.yahoo.co.jp:443/',
            encoding: 'utf-8',
            isXml: false
          });
          assert(typeOf(res) === 'object');
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('ルートからの絶対パスリンク => ドキュメントルートを基準にしたリンク先を取得する', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        $('.root').click(function (err, $, res, body) {
          assert($.documentInfo().url === helper.url('~info') + '?hoge=fuga&piyo=');
          assert(typeOf(res) === 'object');
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('javascriptリンク => エラー', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        $('.js').click(function (err, $, res, body) {
          assert(err.message === 'Invalid URI "javascript:history.back();"');
          assert(! res);
          assert(! $);
          assert(! body);
          done();
        });
      });
    });

    it('ハッシュリンク => 結果的に同じページを取得するが現在のページ情報にハッシュが追加される', function (done) {
      var url = helper.url('form', 'utf-8');
      cli.fetch(url, function (err, $, res, body) {
        $('.hash').click(function (err, $, res, body) {
          assert($.documentInfo().url === url + '#hoge');
          assert(typeOf(res) === 'object');
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('複数のa要素 => 先頭のリンクのみが対象となる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        $('a').click(function (err, $, res, body) {
          assert.deepEqual($.documentInfo(), {
            url: helper.url('auto', 'euc-jp'),
            encoding: 'euc-jp',
            isXml: false
          });
          assert(typeOf(res) === 'object');
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    each([ 0, 1, 2 ], function (idx) {
      it('生のa要素 => リンク先を取得できる(' + idx + '番目)', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          $($('.rel')[idx]).click(function (err, $, res, body) {
            assert.deepEqual($.documentInfo(), {
              url: helper.url('auto', 'euc-jp'),
              encoding: 'euc-jp',
              isXml: false
            });
            assert(typeOf(res) === 'object');
            assert(typeOf($) === 'function');
            assert(typeOf(body) === 'string');
            done();
          });
        });
      });
    });

    it('無から作成したa要素(jQuery形式) => リンク先を取得できる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var url = helper.url('auto', 'utf-8');
        $('<a/>').attr('href', url).click(function (err, $, res, body) {
          assert.deepEqual($.documentInfo(), {
            url: url,
            encoding: 'utf-8',
            isXml: false
          });
          assert(typeOf(res) === 'object');
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });

    it('無から作成したa要素(HTML形式) => リンク先を取得できる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var url = helper.url('auto', 'shift_jis');
        $('<a href="' + url + '">link</a>').click(function (err, $, res, body) {
          assert.deepEqual($.documentInfo(), {
            url: url,
            encoding: 'shift_jis',
            isXml: false
          });
          assert(typeOf(res) === 'object');
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });
  });

  describe('input[type=submit]要素', function () {
    it('所属しているformのsubmitを実行する(編集ボタンのパラメータがセットされる)', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        $('form[name="multi-submit"] input[name=edit]').click(function (err, $, res, body) {
          assert(! err);
          assert($.documentInfo().url === helper.url('~info'));
          var h = res.headers;
          assert(h['request-url'] === '/~info');
          assert(h['request-method'] === 'POST');
          var data = [
            [ 'text', 'あいうえお' ],
            [ 'checkbox', 'bbb' ],
            [ 'edit', '編集' ]
          ].map(function (v, i, a) {
            return encodeURIComponent(v[0]) + '=' + encodeURIComponent(v[1]);
          }).join('&');
          assert(h['post-data'] === data);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });
  });

  describe('button[type=submit]要素', function () {
    it('所属しているformのsubmitを実行する(削除ボタンのパラメータがセットされる)', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        $('form[name="multi-submit"] button[name=delete]').click(function (err, $, res, body) {
          assert(! err);
          assert($.documentInfo().url === helper.url('~info'));
          var h = res.headers;
          assert(h['request-url'] === '/~info');
          assert(h['request-method'] === 'POST');
          var data = [
            [ 'text', 'あいうえお' ],
            [ 'checkbox', 'bbb' ],
            [ 'delete', '削除' ]
          ].map(function (v, i, a) {
            return encodeURIComponent(v[0]) + '=' + encodeURIComponent(v[1]);
          }).join('&');
          assert(h['post-data'] === data);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });
  });

  describe('input[type=image]要素', function () {
    it('所属しているformのsubmitを実行する(パラメータとしてx,y座標がセットされる)', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        $('form[name="multi-submit"] input[name=tweet]').click(function (err, $, res, body) {
          assert(! err);
          assert($.documentInfo().url === helper.url('~info'));
          var h = res.headers;
          assert(h['request-url'] === '/~info');
          assert(h['request-method'] === 'POST');
          var data = [
            [ 'text', 'あいうえお' ],
            [ 'checkbox', 'bbb' ],
            [ 'tweet.x', 0 ],
            [ 'tweet.y', 0 ]
          ].map(function (v, i, a) {
            return encodeURIComponent(v[0]) + '=' + encodeURIComponent(v[1]);
          }).join('&');
          assert(h['post-data'] === data);
          assert(typeOf($) === 'function');
          assert(typeOf(body) === 'string');
          done();
        });
      });
    });
  });
});

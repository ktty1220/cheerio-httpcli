/*eslint-env mocha*/
/*eslint no-invalid-this:0, no-undefined:0*/
/*jshint -W100*/
var assert = require('power-assert');
var typeOf = require('type-of');
var each   = require('foreach');
var helper = require('./_helper');
var cli    = require('../index');

describe('cheerio:url', function () {
  describe('対応していない要素 => エラー', function () {
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
          try {
            $(elem).eq(0).url();
            throw new Error('not thrown');
          } catch (e) {
            assert(e.message === 'element is not link, img, script or link');
          }
          done();
        });
      });
    });
  });

  describe('要素数0 => []を返す', function () {
    each([
      'header',
      'p',
      'span',
      'input[type=button]'
    ], function (elem) {
      it(elem, function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $(elem).eq(0).url();
          assert(typeOf(actual) === 'array');
          assert(actual.length === 0);
          done();
        });
      });
    });
  });

  it('相対パスリンク => 現在のページを基準にした絶対URLを返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.rel').eq(0).url();
      assert(actual === helper.url('auto', 'euc-jp'));
      done();
    });
  });

  it('外部URLリンク => URLをそのまま返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.external').url();
      assert(actual === 'http://www.yahoo.co.jp/');
      done();
    });
  });

  it('ルートからの絶対パスリンク => ドキュメントルートを基準にした絶対URLを返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.root').url();
      assert(actual === helper.url('~info') + '?hoge=fuga&piyo=');
      done();
    });
  });

  it('javascriptリンク => そのまま返す(javascript:...)', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.js').url();
      assert(actual === 'javascript:history.back();');
      done();
    });
  });

  it('ハッシュリンク => 現在のページのURLの末尾にハッシュを追加して返す', function (done) {
    var url = helper.url('form', 'utf-8');
    cli.fetch(url, function (err, $, res, body) {
      var actual = $('.hash').url();
      assert(actual === url + '#hoge');
      done();
    });
  });

  it('複数のa要素 => 絶対URLの配列を返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var expcted = [
        helper.url('auto', 'euc-jp'),
        helper.url('auto', 'euc-jp'),
        helper.url('auto', 'euc-jp'),
        undefined,
        '',
        helper.url('~info?hoge=fuga&piyo='),
        'http://www.yahoo.co.jp/',
        'javascript:history.back();',
        helper.url('form', 'utf-8') + '#hoge',
        helper.url('form', 'xxx')
      ];
      var actual = $('a').url();
      assert.deepEqual(actual, expcted);
      done();
    });
  });

  it('hrefが指定されていないa要素 => undefinedを返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.undef').url();
      assert(typeOf(actual) === 'undefined');
      done();
    });
  });

  it('hrefが空のa要素 => 空文字を返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.empty').url();
      assert(actual === '');
      done();
    });
  });

  each([ 0, 1, 2 ], function (idx) {
    it('生のa要素 => 絶対URLを取得できる(' + idx + '番目)', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var actual = $($('.rel')[idx]).url();
        assert(actual === helper.url('auto', 'euc-jp'));
        done();
      });
    });
  });

  it('無から作成したa要素(jQuery形式) => 絶対URLを取得できる', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('<a/>').attr('href', '../auto/shift_jis.html').url();
      assert(actual === helper.url('auto', 'shift_jis'));
      done();
    });
  });

  it('無から作成したa要素(HTML形式) => 絶対URLを取得できる', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('<a href="/top.php?login=1">link</a>').url();
      assert(actual === helper.url('top.php?login=1'));
      done();
    });
  });

  describe('filterオプション', function () {
    describe('absolute: false => 絶対URLリンクは除外される', function () {
      it('単一要素 => undefined', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $('.external').url({ absolute: false });
          assert(typeOf(actual) === 'undefined');
          done();
        });
      });

      it('複数要素 => 絶対URLリンクを除外したURL配列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            undefined,
            '',
            helper.url('~info?hoge=fuga&piyo='),
            'javascript:history.back();',
            helper.url('form', 'utf-8') + '#hoge',
            helper.url('form', 'xxx')
          ];
          var actual = $('a').url({ absolute: false });
          assert.deepEqual(actual, expcted);
          done();
        });
      });
    });

    describe('relative: false => 相対URLリンクは除外される', function () {
      it('単一要素 => undefined', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $('.rel').eq(0).url({ relative: false });
          assert(typeOf(actual) === 'undefined');
          done();
        });
      });

      it('複数要素 => 相対URLリンクを除外したURL配列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            undefined,
            '',
            'http://www.yahoo.co.jp/',
            'javascript:history.back();'
          ];
          var actual = $('a').url({ relative: false });
          assert.deepEqual(actual, expcted);
          done();
        });
      });
    });

    describe('invalid: false => URLでないものは除外される', function () {
      it('単一要素(hrefなし) => undefined', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $('.undef').url({ invalid: false });
          assert(typeOf(actual) === 'undefined');
          done();
        });
      });

      it('単一要素(空) => undefined', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $('.empty').url({ invalid: false });
          assert(typeOf(actual) === 'undefined');
          done();
        });
      });

      it('単一要素(javascript) => undefined', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $('.js').url({ invalid: false });
          assert(typeOf(actual) === 'undefined');
          done();
        });
      });

      it('複数要素 => URLでないものを除外したURL配列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            helper.url('~info?hoge=fuga&piyo='),
            'http://www.yahoo.co.jp/',
            helper.url('form', 'utf-8') + '#hoge',
            helper.url('form', 'xxx')
          ];
          var actual = $('a').url({ invalid: false });
          assert.deepEqual(actual, expcted);
          done();
        });
      });
    });

    describe('複合 => それぞれのfilterが組み合わせる', function () {
      it('absolute: false & relative: false => URLでないもののみ返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            undefined,
            '',
            'javascript:history.back();'
          ];
          var actual = $('a').url({
            absolute: false,
            relative: false
          });
          assert.deepEqual(actual, expcted);
          done();
        });
      });

      it('absolute: false & invalid: false => 相対URLのみ返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            helper.url('~info?hoge=fuga&piyo='),
            helper.url('form', 'utf-8') + '#hoge',
            helper.url('form', 'xxx')
          ];
          var actual = $('a').url({
            absolute: false,
            invalid: false
          });
          assert.deepEqual(actual, expcted);
          done();
        });
      });

      it('relative: false & invalid: false => 絶対URLのみ返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            'http://www.yahoo.co.jp/'
          ];
          var actual = $('a').url({
            relative: false,
            invalid: false
          });
          assert.deepEqual(actual, expcted);
          done();
        });
      });
    });
  });

  describe('img要素', function () {
    before(function () {
      this.base64img = helper.toBase64('fixtures/img/img/sports.jpg');
    });

    it('単一要素 => srcに指定したURLを絶対URLにして返す', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var expected = helper.url('img', 'img/cat').replace(/\.html/, '.png');
        var actual = $('.rel').url();
        assert(actual === expected);
        done();
      });
    });

    it('複数要素 => 各要素のsrcのURLを絶対URLにした配列を返す', function (done) {
      var _this = this;
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var base = helper.url('img');
        var expected = [
          base + '/img/cat.png',
          base + '/~mega',
          base + '/img/1x1.gif',
          base + '/img/1x1.gif',
          base + '/img/1x1.gif',
          undefined,
          '',
          base + '/img/food.jpg?hoge=fuga&piyo=',
          'http://www.yahoo.co.jp/favicon.ico',
          'javascript:getPicture();',
          base + '/not-found.gif',
          'data:image/jpg;base64,' + _this.base64img
        ];
        var actual = $('img').url([]);
        assert.deepEqual(actual, expected);
        done();
      });
    });

    it('Base64はURLでないものとして扱われる', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var actual = $('.base64').url({ invalid: false });
        assert(typeOf(actual) === 'undefined');
        done();
      });
    });

    describe('srcAttrs', function () {
      it('無指定 => デフォルトの優先順で属性を検索する', function (done) {
        cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
          var base = helper.url('img');
          assert($('.lazy1').url() === base + '/img/cat.png');
          assert($('.lazy2').url() === base + '/img/food.jpg');
          assert($('.lazy3').url() === base + '/img/1x1.gif');
          done();
        });
      });

      it('文字列 => 指定した文字列属性をsrcよりも優先して検索する', function (done) {
        cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
          var base = helper.url('img');
          var attr = 'data-original-src';
          assert($('.lazy1').url(attr) === base + '/img/1x1.gif');
          assert($('.lazy2').url(attr) === base + '/img/1x1.gif');
          assert($('.lazy3').url(attr) === base + '/img/sports.jpg');
          done();
        });
      });

      it('配列 => 指定した配列順で検索する', function (done) {
        cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
          var base = helper.url('img');
          var attr = [
            'data-original-src',
            'data-original',
            'data-lazy-src'
          ];
          assert($('.lazy1').url(attr) === base + '/img/cat.png');
          assert($('.lazy2').url(attr) === base + '/img/food.jpg');
          assert($('.lazy3').url(attr) === base + '/img/sports.jpg');
          done();
        });
      });

      it('存在しない属性 => srcのURLを絶対URLにして返す', function (done) {
        cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
          var base = helper.url('img');
          var attr = [
            'data-foo-bar'
          ];
          assert($('.lazy1').url(attr) === base + '/img/1x1.gif');
          assert($('.lazy2').url(attr) === base + '/img/1x1.gif');
          assert($('.lazy3').url(attr) === base + '/img/1x1.gif');
          done();
        });
      });

      it('空配列 => srcのURLを絶対URLにして返す', function (done) {
        cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
          var base = helper.url('img');
          assert($('.lazy1').url([]) === base + '/img/1x1.gif');
          assert($('.lazy2').url([]) === base + '/img/1x1.gif');
          assert($('.lazy3').url([]) === base + '/img/1x1.gif');
          done();
        });
      });
    });
  });

  describe('a要素とimg要素の複合', function () {
    before(function () {
      this.base64img = helper.toBase64('fixtures/img/img/sports.jpg');
    });

    it('各要素のhref/srcのURLを絶対URLにした配列を返す', function (done) {
      var _this = this;
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var base = helper.url('img');
        var expected = [
          base + '/img/cat.png',
          base + '/~mega',
          base + '/img/1x1.gif',
          base + '/img/1x1.gif',
          base + '/img/1x1.gif',
          undefined,
          '',
          base + '/img/food.jpg?hoge=fuga&piyo=',
          'http://www.yahoo.co.jp/favicon.ico',
          'javascript:getPicture();',
          base + '/not-found.gif',
          'data:image/jpg;base64,' + _this.base64img,
          'http://www.google.co.jp/',
          helper.url('~info?foo=1&bar=2&baz=3')
        ];
        var actual = $('img, a').url([]);
        assert.deepEqual(actual, expected);
        done();
      });
    });

    it('filterオプション(外部リンクのみ取得)', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var expected = [
          'http://www.yahoo.co.jp/favicon.ico',
          'http://www.google.co.jp/'
        ];
        var actual = $('img, a').url({ relative: false, invalid: false });
        assert.deepEqual(actual, expected);
        done();
      });
    });
  });

  describe('script要素', function () {
    it('単一要素 => srcに指定したURLを絶対URLにして返す', function (done) {
      cli.fetch(helper.url('script', 'index'), function (err, $, res, body) {
        var expected = helper.url('script', 'js/cat').replace(/\.html/, '.js');
        var actual = $('.rel').url();
        assert(actual === expected);
        done();
      });
    });

    it('単一のインラインでJavaScriptが書かれているscript要素 => srcには何も指定がないのでundefinedで返す', function (done) {
      cli.fetch(helper.url('script', 'index'), function (err, $, res, body) {
        var actual = $('.inline').url();
        assert(typeOf(actual) === 'undefined');
        done();
      });
    });

    it('複数要素 => 各要素のsrcのURLを絶対URLにした配列を返す', function (done) {
      cli.fetch(helper.url('script', 'index'), function (err, $, res, body) {
        var base = helper.url('script');
        var expected = [
          base + '/js/cat.js',
          undefined,
          '',
          base + '/js/food.js?hoge=fuga&piyo=',
          'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js',
          base + '/not-found.js',
          undefined,
          base + '/js/dog.js'
        ];
        var actual = $('script').url([]);
        assert.deepEqual(actual, expected);
        done();
      });
    });
  });

  describe('link要素', function () {
    it('単一要素 => hrefに指定したURLを絶対URLにして返す', function (done) {
      cli.fetch(helper.url('link', 'index'), function (err, $, res, body) {
        var expected = helper.url('link', 'css/cat').replace(/\.html/, '.css');
        var actual = $('.rel').url();
        assert(actual === expected);
        done();
      });
    });

    it('複数要素 => 各要素のhrefのURLを絶対URLにした配列を返す', function (done) {
      cli.fetch(helper.url('link', 'index'), function (err, $, res, body) {
        var base = helper.url('link');
        var expected = [
          base + '/css/cat.css',
          undefined,
          '',
          base + '/css/food.css?hoge=fuga&piyo=',
          'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
          base + '/not-found.css',
          base + '/en.html',
          base + '/css/dog.css'
        ];
        var actual = $('link').url([]);
        assert.deepEqual(actual, expected);
        done();
      });
    });
  });
});

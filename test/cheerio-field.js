/*eslint-env mocha*/
/*eslint no-invalid-this:0, no-undefined:0, max-len:[1, 150, 2]*/
var assert = require('power-assert');
var typeOf = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('cheerio:field', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  describe('根本的エラー', function () {
    it('form要素以外を指定してsubmit => element is not form', function (done) {
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

    it('要素数0のfield => no elements', function (done) {
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

  });

  describe('name,valueを指定(nameにvalueをセット)', function () {
    it('valueが文字列 => name部品にvalueをセット', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=login]');
        var user = 'hoge';
        $form.field('user', user);
        assert($form.find('[name=user]').val() === user);
        $form.submit(function (err, $, res, body) {
          assert(res.cookies.user === user);
          done();
        });
      });
    });

    /*jscs:disable requireBlocksOnNewline*/
    it('valueが関数 => name部品にvalueの関数結果をセット', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=login]');
        var user = 'fuga';
        $form.field('user', function () { return user; });
        assert($form.find('[name=user]').val() === user);
        $form.submit(function (err, $, res, body) {
          assert(res.cookies.user === user);
          done();
        });
      });
    });
    /*jscs:enable requireBlocksOnNewline*/

    it('valueがnull => name部品のvalueが未指定状態になる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=login]');
        var user = null;
        $form.field('user', user);
        assert(typeOf($form.find('[name=user]').val()) === 'undefined');
        $form.submit(function (err, $, res, body) {
          assert(res.cookies.user === '');
          done();
        });
      });
    });
  });

  describe('nameが存在しない(onNotFoundによって分岐)', function () {
    it('onNotFound [なし] => valueはセットされない', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=login]');
        var name = '__user';
        $form.field(name, 'hoge');
        assert(name in $('form[name=login]').field() === false);
        done();
      });
    });

    it('onNotFound [append] => valueはセットされない', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=login]');
        var name = '__user';
        var value = 'hoge';
        $form.field(name, value, 'append');
        assert($('form[name=login]').field()[name] === value);
        done();
      });
    });

    it('onNotFound [throw] => 例外発生', function (done) {
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
});

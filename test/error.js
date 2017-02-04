/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('error', function () {
  it('ソフト404 => エラーだがHTMLを取得できる', function (done) {
    var url = helper.url('~404');
    cli.fetch(url, { hoge: 'fuga' }, function (err, $, res, body) {
      assert(err.message === 'server status');
      assert(err.statusCode === 404);
      assert(err.url === url);
      assert.deepEqual(err.param, { hoge: 'fuga' });
      assert($('title').text(), 'ページが見つかりません');
      assert(body.length > 0);
      done();
    });
  });

  it('ハード404 => HTMLを取得できない', function (done) {
    var url = helper.url('error', 'not-found');
    cli.fetch(url, { hoge: 'fuga' }, function (err, $, res, body) {
      assert(err.message === 'no content');
      assert(err.statusCode === 404);
      assert(err.url === url);
      assert.deepEqual(err.param, { hoge: 'fuga' });
      assert(! $);
      assert(! body);
      done();
    });
  });

  it('サーバーが見つからない => HTMLを取得できない', function (done) {
    var errhost = 'http://localhost:59999/';
    cli.fetch(errhost, { hoge: 'fuga' }, function (err, $, res, body) {
      assert(err.errno, 'ENOTFOUND');
      assert(err.url, errhost);
      assert.deepEqual(err.param, { hoge: 'fuga' });
      assert(! $);
      assert(! body);
      done();
    });
  });

  it('タイムアウトの値を超えるとエラーになる', function (done) {
    cli.set('timeout', 300);
    var url = helper.url('~slow');
    cli.fetch(url, function (err, $, res, body) {
      assert(helper.isTimedOut(err));
      assert(! err.statusCode);
      assert(err.url === url);
      assert(! body);
      done();
    });
  });
});

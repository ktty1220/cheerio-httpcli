/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('error', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  it('ソフト404の場合はエラーだがHTMLを取得できる', function (done) {
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

  it('ハード404の場合はHTMLを取得できない', function (done) {
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

  it('サーバーが見つからない場合もHTMLを取得できない', function (done) {
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
});

/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('gzip:enable', function () {
  before(function () {
    this.server = helper.server();
    cli.gzip = true;
  });
  after(function () {
    this.server.close();
  });

  it('gzipヘッダを送信して返ってきた圧縮HTMLが解凍されてからUTF-8に変換される', function (done) {
    cli.fetch(helper.url('gzip', 'utf-8'), function (err, $, res, body) {
      assert(res.headers['content-encoding'] === 'gzip');
      assert($('title').text() === '夏目漱石「私の個人主義」');
      done();
    });
  });
});

describe('gzip:disable', function () {
  before(function () {
    this.server = helper.server();
    cli.gzip = false;
  });
  after(function () {
    this.server.close();
  });

  it('gzipヘッダを送信しないで返ってきた生のHTMLがそのままUTF-8に変換される', function (done) {
    cli.fetch(helper.url('gzip', 'utf-8'), function (err, $, res, body) {
      assert(! ('content-encoding' in res.headers));
      assert($('title').text() === '夏目漱石「私の個人主義」');
      done();
    });
  });
});

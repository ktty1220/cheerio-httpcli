/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('gzip:enable', function () {
  before(function () {
    cli.gzip = true;
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
    cli.gzip = false;
  });

  it('gzipヘッダを送信しないで返ってきた生のHTMLがそのままUTF-8に変換される', function (done) {
    cli.fetch(helper.url('gzip', 'utf-8'), function (err, $, res, body) {
      assert(! ('content-encoding' in res.headers));
      assert($('title').text() === '夏目漱石「私の個人主義」');
      done();
    });
  });
});

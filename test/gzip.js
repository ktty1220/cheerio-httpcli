/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('gzip', function () {
  before(function () {
    // - Windows10 + Node.js6の環境においてUser-AgentをGUIブラウザにすると
    //   "content-encoding: gzip"ではなく"transfer-encoding: chunked"になる
    //   (なぜかoperaは対象外)
    //   (Ubuntu16.04では発生しない)
    // - どちらもgzip圧縮はされているので動作としては問題はないが
    //   どこで書き換わっているのかが不明で気持ち悪いのでUser-Agentを変更してテスト
    // - node-staticが送信するresponse headerは"content-encoding: gzip"
    // - requestが受信したresponse headerは"transfer-encoding: chunked"
    // - 上記の状況を見るにNode.js本体のhttpが何かしているような予感
    cli.set('browser', 'googlebot');
  });
  after(function () {
    cli.set('headers', {
      'user-agent': null
    });
  });

  it('enable => gzipヘッダを送信して返ってきた圧縮HTMLが解凍されてからUTF-8に変換される', function (done) {
    cli.set('gzip', true);
    cli.fetch(helper.url('gzip', 'utf-8'), function (err, $, res, body) {
      assert(res.headers['content-encoding'] === 'gzip');
      //assert(res.headers.vary === 'Accept-Encoding');
      //assert(res.headers['transfer-encoding'] === 'chunked');
      assert($('title').text() === '夏目漱石「私の個人主義」');
      done();
    });
  });

  it('disable => gzipヘッダを送信しないで返ってきた生のHTMLがそのままUTF-8に変換される', function (done) {
    cli.set('gzip', false);
    cli.fetch(helper.url('gzip', 'utf-8'), function (err, $, res, body) {
      assert(! ('content-encoding' in res.headers));
      assert(! ('transfer-encoding' in res.headers));
      assert(! ('vary' in res.headers));
      assert(res.headers['content-length'] > 0);
      assert($('title').text() === '夏目漱石「私の個人主義」');
      done();
    });
  });
});

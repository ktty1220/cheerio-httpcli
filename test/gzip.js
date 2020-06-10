const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('gzip', () => {
  beforeAll(() => {
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
  afterAll(() => {
    cli.set('headers', {
      'user-agent': null
    });
  });

  test('enable => gzipヘッダを送信して返ってきた圧縮HTMLが解凍されてからUTF-8に変換される', () => {
    return new Promise((resolve) => {
      cli.set('gzip', true);
      cli.fetch(`${endpoint}/gzip/utf-8.html`, (err, $, res, body) => {
        expect(res.headers['content-encoding']).toStrictEqual('gzip');
        // expect(res.headers.vary).toStrictEqual('Accept-Encoding');
        // expect(res.headers['transfer-encoding']).toStrictEqual('chunked');
        expect($('title').text()).toStrictEqual('夏目漱石「私の個人主義」');
        resolve();
      });
    });
  });

  test('disable => gzipヘッダを送信しないで返ってきた生のHTMLがそのままUTF-8に変換される', () => {
    return new Promise((resolve) => {
      cli.set('gzip', false);
      cli.fetch(`${endpoint}/gzip/utf-8.html`, (err, $, res, body) => {
        expect('content-encoding' in res.headers).toStrictEqual(false);
        expect('transfer-encoding' in res.headers).toStrictEqual(false);
        expect('vary' in res.headers).toStrictEqual(false);
        const contentLength = res.headers['content-length'];
        expect(contentLength).toMatch(/^\d+$/);
        expect(parseInt(contentLength, 10)).toBeGreaterThan(0);
        expect($('title').text()).toStrictEqual('夏目漱石「私の個人主義」');
        resolve();
      });
    });
  });
});

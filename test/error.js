const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('error', () => {
  test('ソフト404 => エラーだがHTMLを取得できる', () => {
    return new Promise((resolve) => {
      const url = `${endpoint}/~e404`;
      cli.fetch(url, { hoge: 'fuga' }, (err, $, res, body) => {
        expect(err.message).toStrictEqual('server status');
        expect(err.statusCode).toStrictEqual(404);
        expect(err.url).toStrictEqual(url);
        expect(err.param).toStrictEqual({ hoge: 'fuga' });
        expect($('title').text()).toStrictEqual('ページが見つかりません');
        expect(body.length).toBeGreaterThan(0);
        resolve();
      });
    });
  });

  test('ハード404 => HTMLを取得できない', () => {
    return new Promise((resolve) => {
      const url = `${endpoint}/error/not-found.html`;
      cli.fetch(url, { hoge: 'fuga' }, (err, $, res, body) => {
        expect(err.message).toStrictEqual('no content');
        expect(err.statusCode).toStrictEqual(404);
        expect(err.url).toStrictEqual(url);
        expect(err.param).toStrictEqual({ hoge: 'fuga' });
        expect($).toBeUndefined();
        expect(body).toBeUndefined();
        resolve();
      });
    });
  });

  test('サーバーが見つからない => HTMLを取得できない', () => {
    return new Promise((resolve) => {
      const errhost = 'http://not.exists.server.foo:59999/';
      cli.fetch(errhost, { hoge: 'fuga' }, (err, $, res, body) => {
        expect(err.code).toStrictEqual('ENOTFOUND');
        expect(err.url).toStrictEqual(errhost);
        expect(err.param).toStrictEqual({ hoge: 'fuga' });
        expect($).toBeUndefined();
        expect(body).toBeUndefined();
        resolve();
      });
    });
  });

  test('タイムアウトの値を超えるとエラーになる', () => {
    return new Promise((resolve) => {
      cli.set('timeout', 300);
      const url = `${endpoint}/~slow`;
      cli.fetch(url, (err, $, res, body) => {
        expect(helper.isTimedOut(err)).toStrictEqual(true);
        expect(err.statusCode).toBeUndefined();
        expect(err.url).toStrictEqual(url);
        expect(body).toBeUndefined();
        resolve();
      });
    });
  });
});

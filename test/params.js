const typeOf = require('type-of');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('params', () => {
  test('パラメータの指定がURLに反映されている', () => {
    return new Promise((resolve) => {
      const param = { hoge: 'fuga', piyo: 999, doya: true };
      cli.fetch(`${endpoint}/~info`, param, (err, $, res, body) => {
        expect(res.headers['request-url']).toStrictEqual('/~info?hoge=fuga&piyo=999&doya=true');
        resolve();
      });
    });
  });

  test('クッキーがセットされている & 変更不可', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/~info`, (err, $, res, body) => {
        expect(typeOf(res.cookies)).toStrictEqual('object');
        expect(res.cookies.session_id).toStrictEqual('hahahaha');
        expect(res.cookies.login).toStrictEqual('1');
        res.cookies.session_id = 'fooooooo';
        expect(res.cookies.session_id).toStrictEqual('hahahaha');
        resolve();
      });
    });
  });
});

const typeOf = require('type-of');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

const reUuid = /^user_([0-9a-z]{4,}-){4}([0-9a-z]{4,})$/i;

describe('reset', () => {
  test('パラメータ変更 => reset => 各パラメータが初期化される', () => {
    cli.set('browser', 'googlebot');
    cli.set('timeout', 9999);
    cli.set('gzip', false);
    cli.set('referer', false);
    cli.set('followMetaRefresh', true);
    cli.set('maxDataSize', 9999);
    cli.set('debug', true);

    cli.reset();

    expect(cli.headers).toStrictEqual({});
    expect(cli.timeout).toStrictEqual(30000);
    expect(cli.gzip).toStrictEqual(true);
    expect(cli.referer).toStrictEqual(true);
    expect(cli.followMetaRefresh).toStrictEqual(false);
    expect(cli.maxDataSize).toBeNull();
    expect(cli.debug).toStrictEqual(false);
  });

  test('アクセス => アクセス => クッキーが保持される', () => {
    const url = `${endpoint}/~session`;
    let sid = null;
    return cli
      .fetch(url)
      .then((result) => {
        sid = result.response.cookies.x_session_id;
        expect(typeOf(sid)).toStrictEqual('string');
        expect(sid).toMatch(reUuid);
        return cli.fetch(url);
      })
      .then((result) => {
        expect(sid).toStrictEqual(result.response.cookies.x_session_id);
      });
  });

  test('アクセス => reset => アクセス => クッキーが破棄される', () => {
    const url = `${endpoint}/~session`;
    let sid = null;
    return cli
      .fetch(url)
      .then((result) => {
        sid = result.response.cookies.x_session_id;
        expect(typeOf(sid)).toStrictEqual('string');
        expect(sid).toMatch(reUuid);
        cli.reset();
        return cli.fetch(url);
      })
      .then((result) => {
        const newSid = result.response.cookies.x_session_id;
        expect(typeOf(newSid)).toStrictEqual('string');
        expect(newSid).toMatch(reUuid);
        expect(sid).not.toStrictEqual(newSid);
      });
  });
});

const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('referer:enable', () => {
  test('Referer自動設定を有効 => リクエストの度にRefererがセットされる', async () => {
    cli.set('referer', true);

    let url = `${endpoint}/auto/euc-jp.html`;
    await cli.fetch(url);
    const r1 = await cli.fetch(`${endpoint}/~info`);
    expect(r1.response.headers.referer).toStrictEqual(url);

    url = `${endpoint}/manual/utf-8(html5).html`;
    await cli.fetch(url);
    const r2 = await cli.fetch(`${endpoint}/~info`);
    expect(r2.response.headers.referer).toStrictEqual(url);

    // エラーページはRefererにセットされない
    url = `${endpoint}/~info`;
    await expect(cli.fetch(`${endpoint}/~e404`)).rejects.toThrow('server status');
    const r3 = await cli.fetch(`${endpoint}/~info`);
    expect(r3.response.headers.referer).toStrictEqual(url);
  });
});

describe('referer:disable', () => {
  test('Referer自動設定を無効 => Refererはセットされない', async () => {
    cli.set('referer', false);
    cli.set('headers', {
      Referer: null
    });

    let url = `${endpoint}/auto/euc-jp.html`;
    await cli.fetch(url);
    const r1 = await cli.fetch(`${endpoint}/~info`);
    expect(r1.response.headers.referer).toBeUndefined();

    url = `${endpoint}/manual/utf-8(html5).html`;
    await cli.fetch(url);
    const r2 = await cli.fetch(`${endpoint}/~info`);
    expect(r2.response.headers.referer).toBeUndefined();
  });
});

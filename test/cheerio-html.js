const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('cheerio:html', () => {
  let spy = null;
  beforeEach(() => {
    spy = jest.spyOn(console, 'warn');
    spy.mockImplementation((x) => x);
  });
  afterEach(() => {
    spy.mockReset();
    spy.mockRestore();
  });

  test('_html => DEPRECATEDメッセージが表示される', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/entities/hex.html`, (err, $, res, body) => {
        $('h1')._html();
        expect(spy).toHaveBeenCalledTimes(1);
        const actual = helper.stripMessageDetail(spy.mock.calls[0][0]);
        expect(actual).toStrictEqual('[DEPRECATED] _html() will be removed in the future)');
        resolve();
      });
    });
  });

  test('_text => DEPRECATEDメッセージが表示される', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/entities/hex.html`, (err, $, res, body) => {
        $('h1')._text();
        expect(spy).toHaveBeenCalledTimes(1);
        const actual = helper.stripMessageDetail(spy.mock.calls[0][0]);
        expect(actual).toStrictEqual('[DEPRECATED] _text() will be removed in the future)');
        resolve();
      });
    });
  });
});

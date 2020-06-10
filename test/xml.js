const each = require('foreach');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('xml', () => {
  // 名前空間のコロンはフィルタと混同されないように「\\」でエスケープする
  const expected = {
    channel: {
      title: 'タイトル',
      description: 'RSSテスト',
      language: 'ja',
      pubDate: 'Thu, 1 Dec 2016 00:00:00 +0900'
    },
    item: [
      {
        title: 'RSS記事1',
        link: 'http://this.is.rss/news1.html',
        pubDate: 'Fri, 2 Dec 2016 00:00:00 +0900',
        'dc\\:author': '山田太郎',
        category: 'その他'
      },
      {
        title: 'RSS記事2',
        link: 'http://this.is.rss/news2.php?aaa=%E3%83%86%E3%82%B9%E3%83%88%E3%81%A7%E3%81%99',
        pubDate: 'Sat, 3 Dec 2016 00:00:00 +0900',
        'dc\\:author': '山田次郎',
        category: ' 未登録 '
      }
    ]
  };

  describe('xmlModeでパースされる', () => {
    each(['xml', 'rss', 'rdf', 'atom', 'opml', 'xsl', 'xslt'], (ext) => {
      let contentType = 'text/html';
      let caption = '拡張子';
      if (ext === 'xml') {
        contentType = 'application/xml';
        caption = 'Content-Type';
      }
      test(`${ext}: ${caption}で判別`, () => {
        return new Promise((resolve) => {
          cli.fetch(`${`${endpoint}/~xml`}.${ext}`, (err, $, res, body) => {
            expect(res.headers['content-type']).toStrictEqual(contentType);
            expect($.documentInfo().isXml).toStrictEqual(true);
            each(expected.channel, (val, name) => {
              expect($(`channel > ${name}`).text()).toStrictEqual(val);
            });
            expect($('item').length).toStrictEqual(expected.item.length);
            each(expected.item, (exp, i) => {
              each(exp, (val, name) => {
                expect($('item').eq(i).children(name).text()).toStrictEqual(val);
              });
            });
            resolve();
          });
        });
      });
    });
  });

  describe('forceHtml: true', () => {
    beforeAll(() => {
      cli.set('forceHtml', true);
    });

    afterAll(() => {
      cli.set('forceHtml', false);
    });

    each(['xml', 'rss', 'rdf', 'atom', 'opml', 'xsl', 'xslt'], (ext) => {
      const contentType = ext === 'xml' ? 'application/xml' : 'text/html';
      test(`${ext}: xmlModeが使用されない`, () => {
        return new Promise((resolve) => {
          cli.fetch(`${`${endpoint}/~xml`}.${ext}`, (err, $, res, body) => {
            expect(res.headers['content-type']).toStrictEqual(contentType);
            expect($.documentInfo().isXml).toStrictEqual(false);
            each(expected.channel, (val, name) => {
              expect($(`channel > ${name}`).text()).toStrictEqual(val);
            });
            expect($('item').length).toStrictEqual(expected.item.length);
            each(
              expected.item.map((v, i) => {
                v.link = '';
                if (i === 1) {
                  v.category = '';
                }
                return v;
              }),
              (exp, i) => {
                each(exp, (val, name) => {
                  expect($('item').eq(i).children(name).text()).toStrictEqual(val);
                });
              }
            );
            resolve();
          });
        });
      });
    });
  });
});

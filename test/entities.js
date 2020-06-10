const fs = require('fs');
const path = require('path');
const he = require('he');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('entities:decode', () => {
  const expected = {
    text: '夏目漱石「私の個人主義」',
    html: '夏目漱石「<strong>私の個人主義</strong>」',
    sign: '<"私の個人主義"&\'吾輩は猫である\'>'
  };

  test('16進数エンティティが文字列に変換されている', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/entities/hex.html`, (err, $, res, body) => {
        expect($('h1').text()).toStrictEqual(expected.text);
        expect($('h1').html()).toStrictEqual(expected.html);
        expect($('h1').entityHtml()).toStrictEqual(
          he.encode(expected.html, {
            allowUnsafeSymbols: true
          })
        );
        resolve();
      });
    });
  });

  test('10進数エンティティが文字列に変換されている', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/entities/num.html`, (err, $, res, body) => {
        expect($('h1').text()).toStrictEqual(expected.text);
        expect($('h1').html()).toStrictEqual(expected.html);
        expect($('h1').entityHtml()).toStrictEqual(
          he.encode(expected.html, {
            allowUnsafeSymbols: true
          })
        );
        resolve();
      });
    });
  });

  test('16進数と10進数混在エンティティが文字列に変換されている', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/entities/hex&num.html`, (err, $, res, body) => {
        expect($('h1').text()).toStrictEqual(expected.text);
        expect($('h1').html()).toStrictEqual(expected.html);
        expect($('h1').entityHtml()).toStrictEqual(
          he.encode(expected.html, {
            allowUnsafeSymbols: true
          })
        );
        resolve();
      });
    });
  });

  test('文字参照エンティティが文字列に変換されている', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/entities/sign.html`, (err, $, res, body) => {
        for (let i = 1; i <= 3; i++) {
          expect($(`h${i}`).text()).toStrictEqual(expected.sign);
          expect($(`h${i}`).html()).toStrictEqual(expected.sign);
          expect($('h1').entityHtml()).toStrictEqual(
            he.encode(expected.sign, {
              allowUnsafeSymbols: false,
              useNamedReferences: true
            })
          );
        }
        resolve();
      });
    });
  });

  test('無から作成したHTMLのエンティティが文字列に変換されている', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/entities/sign.html`, (err, $, res, body) => {
        const $html = $('<div/>').html('<footer>&copy; 2015 hoge</footer>');
        expect($html.text()).toStrictEqual('© 2015 hoge');
        const expectedHtml = '<footer>© 2015 hoge</footer>';
        expect($html.html()).toStrictEqual(expectedHtml);
        expect($html.entityHtml()).toStrictEqual(
          he.encode(expectedHtml, {
            allowUnsafeSymbols: true,
            useNamedReferences: false
          })
        );
        resolve();
      });
    });
  });

  test('エンティティで書かれたattrが文字列に変換されている', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/entities/etc.html`, (err, $, res, body) => {
        expect($('img').attr('alt')).toStrictEqual(expected.text);
        resolve();
      });
    });
  });

  test('エンティティで書かれたdataが文字列に変換されている', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/entities/etc.html`, (err, $, res, body) => {
        expect($('p').data('tips')).toStrictEqual(expected.sign);
        resolve();
      });
    });
  });

  describe('$.html', () => {
    test('元htmlにエンティティなし => そのまま取得', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/auto/utf-8.html`, (err, $, res, body) => {
          expect($.html()).toStrictEqual(
            fs.readFileSync(path.join(__dirname, 'fixtures/auto/utf-8.html'), 'utf-8')
          );
          resolve();
        });
      });
    });
    test('元htmlにエンティティあり => 文字列に変換されている', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/entities/sign.html`, (err, $, res, body) => {
          const html = he.decode(
            fs.readFileSync(path.join(__dirname, 'fixtures/entities/sign.html'), 'utf-8')
          );
          expect($.html()).toStrictEqual(html);
          resolve();
        });
      });
    });
  });
});

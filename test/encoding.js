const each = require('foreach');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('encoding:auto', () => {
  beforeAll(() => {
    cli.set('iconv', 'iconv-lite');
  });

  each(helper.files('auto'), (enc) => {
    test(`エンコーディング自動判定により正常にUTF-8に変換される(${enc})`, () => {
      return new Promise((resolve) => {
        const url = `${endpoint}/auto/${enc}.html`;
        cli.fetch(url, (err, $, res, body) => {
          expect($.documentInfo()).toStrictEqual({
            url: url,
            encoding: enc,
            isXml: false
          });
          expect($('title').text()).toStrictEqual('夏目漱石「私の個人主義」');
          expect($('h1').html()).toStrictEqual('<span>夏目漱石「私の個人主義」</span>');
          resolve();
        });
      });
    });
  });
});

describe('encoding:manual', () => {
  beforeAll(() => {
    cli.set('iconv', 'iconv-lite');
  });

  each(helper.files('manual'), (enc) => {
    test(`<head>タグのcharsetからエンコーディングが判定され正常にUTF-8に変換される(${enc})`, () => {
      return new Promise((resolve) => {
        const url = `${endpoint}/manual/${enc}.html`;
        cli.fetch(url, (err, $, res, body) => {
          expect($.documentInfo()).toStrictEqual({
            url: url,
            encoding: enc.replace(/\(.+\)/, ''),
            isXml: false
          });
          expect($('title').text()).toStrictEqual('１');
          resolve();
        });
      });
    });
  });
});

describe('encoding:error', () => {
  beforeAll(() => {
    cli.set('iconv', 'iconv-lite');
  });

  test('iconv-liteで未対応のページは変換エラーとなる(iso-2022-jp)', () => {
    return new Promise((resolve) => {
      const url = `${endpoint}/error/iso-2022-jp.html`;
      cli.fetch(url, (err, $, res, body) => {
        expect(err.errno).toStrictEqual(22);
        expect(err.code).toStrictEqual('EINVAL');
        expect(err.message).toStrictEqual('EINVAL, Conversion not supported.');
        expect(err.charset).toStrictEqual('iso-2022-jp');
        expect(err.url).toStrictEqual(url);
        resolve();
      });
    });
  });
});

describe('encoding:unknown', () => {
  beforeAll(() => {
    cli.set('iconv', 'iconv-lite');
  });

  test('自動判定でも<head>タグからも文字コードが判別できない => UTF-8として処理される(utf-8)', () => {
    return new Promise((resolve) => {
      const url = `${endpoint}/unknown/utf-8.html`;
      cli.fetch(url, (err, $, res, body) => {
        expect($.documentInfo()).toStrictEqual({
          url: url,
          encoding: null,
          isXml: false
        });
        expect($('title').text()).toStrictEqual('１');
        resolve();
      });
    });
  });

  test('自動判定でも<head>タグからも文字コードが判別できない => UTF-8として処理される(shift_jis)', () => {
    return new Promise((resolve) => {
      const url = `${endpoint}/unknown/shift_jis.html`;
      cli.fetch(url, (err, $, res, body) => {
        expect($.documentInfo()).toStrictEqual({
          url: url,
          encoding: null,
          isXml: false
        });
        expect($('title').text()).not.toStrictEqual('１');
        resolve();
      });
    });
  });

  test('fetch時にエンコーディング指定 => shift_jisとして処理される', () => {
    return new Promise((resolve) => {
      const url = `${endpoint}/unknown/shift_jis.html`;
      cli.fetch(url, {}, 'sjis', (err, $, res, body) => {
        expect($.documentInfo()).toStrictEqual({
          url: url,
          encoding: 'sjis',
          isXml: false
        });
        expect($('title').text()).toStrictEqual('１');
        resolve();
      });
    });
  });

  test('fetch時にエンコーディング指定(param省略) => shift_jisとして処理される', () => {
    return new Promise((resolve) => {
      const url = `${endpoint}/unknown/shift_jis.html`;
      cli.fetch(url, 'sjis', (err, $, res, body) => {
        expect($.documentInfo()).toStrictEqual({
          url: url,
          encoding: 'sjis',
          isXml: false
        });
        expect($('title').text()).toStrictEqual('１');
        resolve();
      });
    });
  });
});

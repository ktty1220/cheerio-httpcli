const typeOf = require('type-of');
const each = require('foreach');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

/**
 * 処理内容は非同期版の処理を使いまわしているので詳細なテストは省略
 * 同期処理の実行確認がメイン
 */
describe('fetchSync', () => {
  afterEach(() => {
    cli.set('timeout', 30000);
  });

  test('同期リクエストが実行される', () => {
    const result = cli.fetchSync(`${endpoint}/auto/utf-8.html`);
    expect(Object.keys(result).sort()).toStrictEqual(['$', 'body', 'response']);
    expect(typeOf(result)).toStrictEqual('object');
    expect(typeOf(result.response)).toStrictEqual('object');
    expect(Object.keys(result.response).sort()).toStrictEqual([
      'body',
      'cookies',
      'headers',
      'request',
      'statusCode'
    ]);
    expect(typeOf(result.$)).toStrictEqual('function');
    expect(typeOf(result.body)).toStrictEqual('string');
    expect(result.$('title').text()).toStrictEqual('夏目漱石「私の個人主義」');
  });

  test('パラメータの指定がURLに反映されている', () => {
    const param = { hoge: 'fuga', piyo: 999, doya: true };
    const result = cli.fetchSync(`${endpoint}/~info`, param);
    expect(Object.keys(result).sort()).toStrictEqual(['$', 'body', 'response']);
    expect(result.response.headers['request-url']).toStrictEqual(
      '/~info?hoge=fuga&piyo=999&doya=true'
    );
  });

  test('クッキーがセットされている & 変更不可', () => {
    const result = cli.fetchSync(`${endpoint}/~info`);
    const res = result.response;
    expect(typeOf(res.cookies)).toStrictEqual('object');
    expect(res.cookies.session_id).toStrictEqual('hahahaha');
    expect(res.cookies.login).toStrictEqual('1');
    res.cookies.session_id = 'fooooooo';
    expect(res.cookies.session_id).toStrictEqual('hahahaha');
  });

  test('encodeの指定が反映される', () => {
    const url = `${endpoint}/unknown/shift_jis.html`;
    const result = cli.fetchSync(url, {}, 'sjis');
    expect(result.$.documentInfo()).toStrictEqual({
      url: url,
      encoding: 'sjis',
      isXml: false
    });
    expect(result.$('title').text()).toStrictEqual('１');
  });

  test('encodeの指定が反映される(param省略)', () => {
    const url = `${endpoint}/unknown/shift_jis.html`;
    const result = cli.fetchSync(url, 'sjis');
    expect(result.$.documentInfo()).toStrictEqual({
      url: url,
      encoding: 'sjis',
      isXml: false
    });
    expect(result.$('title').text()).toStrictEqual('１');
  });

  test('エラー => エラー内容を取得できる', () => {
    const url = `${endpoint}/~e404`;
    const result = cli.fetchSync(url, { hoge: 'fuga' });
    const err = result.error;
    expect(err.message).toStrictEqual('server status');
    expect(err.statusCode).toStrictEqual(404);
    expect(err.url).toStrictEqual(url);
    expect(err.param).toStrictEqual({ hoge: 'fuga' });
    expect(result.$('title').text()).toStrictEqual('ページが見つかりません');
    expect(result.body.length).toBeGreaterThan(0);
  });

  test('タイムアウトの値を超えるとエラーになる', () => {
    cli.set('timeout', 300);
    const url = `${endpoint}/~slow`;
    const result = cli.fetchSync(url);
    const err = result.error;
    expect(helper.isTimedOut(err)).toStrictEqual(true);
    expect(err.statusCode).toBeUndefined();
    expect(err.url).toStrictEqual(url);
    expect(result.body).toBeUndefined();
  });
});

describe('clickSync(a要素)', () => {
  test('fetchSyncからのclickSync => 順番に同期処理でリンク先を取得する', () => {
    const result1 = cli.fetchSync(`${endpoint}/form/utf-8.html`);
    const result2 = result1.$('.rel').clickSync();
    expect(result2.$.documentInfo()).toStrictEqual({
      url: `${endpoint}/auto/euc-jp.html`,
      encoding: 'euc-jp',
      isXml: false
    });
    expect(typeOf(result2.response)).toStrictEqual('object');
    expect(typeOf(result2.$)).toStrictEqual('function');
    expect(typeOf(result2.body)).toStrictEqual('string');
  });

  test('fetch(callback)からのclickSync => 非同期 -> 同期の流れでリンク先を取得する', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const result = $('.rel').clickSync();
        expect(result.$.documentInfo()).toStrictEqual({
          url: `${endpoint}/auto/euc-jp.html`,
          encoding: 'euc-jp',
          isXml: false
        });
        expect(typeOf(result.response)).toStrictEqual('object');
        expect(typeOf(result.$)).toStrictEqual('function');
        expect(typeOf(result.body)).toStrictEqual('string');
        resolve();
      });
    });
  });

  test('fetch(promise)からのclickSync => 非同期 -> 同期の流れでリンク先を取得する', () => {
    return cli.fetch(`${endpoint}/form/utf-8.html`).then((result1) => {
      const result2 = result1.$('.root').clickSync();
      expect(result2.$.documentInfo().url).toStrictEqual(`${`${endpoint}/~info`}?hoge=fuga&piyo=`);
      expect(typeOf(result2.response)).toStrictEqual('object');
      expect(typeOf(result2.$)).toStrictEqual('function');
      expect(typeOf(result2.body)).toStrictEqual('string');
    });
  });

  test('実行前エラーが同期で実行される', () => {
    const result1 = cli.fetchSync(`${endpoint}/form/utf-8.html`);
    const result2 = result1.$('div').clickSync();
    expect(Object.keys(result2)).toStrictEqual(['error']);
    expect(result2.error.message).toStrictEqual('element is not clickable');
  });

  test('実行後エラーが同期で実行される', () => {
    const result1 = cli.fetchSync(`${endpoint}/form/utf-8.html`);
    const result2 = result1.$('.js').clickSync();
    expect(Object.keys(result2)).toStrictEqual(['error']);
    expect(result2.error.message).toStrictEqual('Invalid URI "javascript:history.back();"');
  });
});

describe('clickSync(submit)', () => {
  describe('input[type=submit]要素', () => {
    test('所属しているformのsubmitを同期処理で実行する(編集ボタンのパラメータがセットされる)', () => {
      const result1 = cli.fetchSync(`${endpoint}/form/utf-8.html`);
      const result2 = result1.$('form[name="multi-submit"] input[name=edit]').clickSync();
      expect(result2.error).toBeUndefined();
      expect(result2.$.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
      const h = result2.response.headers;
      expect(h['request-url']).toStrictEqual('/~info');
      expect(h['request-method']).toStrictEqual('POST');
      const data = [
        ['text', 'あいうえお'],
        ['checkbox', 'bbb'],
        ['edit', '編集']
      ]
        .map((v) => `${encodeURIComponent(v[0])}=${encodeURIComponent(v[1])}`)
        .join('&');
      expect(h['post-data']).toStrictEqual(data);
      expect(typeOf(result2.$)).toStrictEqual('function');
      expect(typeOf(result2.body)).toStrictEqual('string');
    });
  });

  describe('button[type=submit]要素', () => {
    test('所属しているformのsubmitを同期処理で実行する(削除ボタンのパラメータがセットされる)', () => {
      const result1 = cli.fetchSync(`${endpoint}/form/utf-8.html`);
      const result2 = result1.$('form[name="multi-submit"] button[name=delete]').clickSync();
      expect(result2.error).toBeUndefined();
      expect(result2.$.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
      const h = result2.response.headers;
      expect(h['request-url']).toStrictEqual('/~info');
      expect(h['request-method']).toStrictEqual('POST');
      const data = [
        ['text', 'あいうえお'],
        ['checkbox', 'bbb'],
        ['delete', '削除']
      ]
        .map((v) => `${encodeURIComponent(v[0])}=${encodeURIComponent(v[1])}`)
        .join('&');
      expect(h['post-data']).toStrictEqual(data);
      expect(typeOf(result2.$)).toStrictEqual('function');
      expect(typeOf(result2.body)).toStrictEqual('string');
    });
  });

  describe('input[type=image]要素', () => {
    test('所属しているformのsubmitを同期処理で実行する(パラメータとしてx,y座標がセットされる)', () => {
      const result1 = cli.fetchSync(`${endpoint}/form/utf-8.html`);
      const result2 = result1.$('form[name="multi-submit"] input[name=tweet]').clickSync();
      expect(result2.error).toBeUndefined();
      expect(result2.$.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
      const h = result2.response.headers;
      expect(h['request-url']).toStrictEqual('/~info');
      expect(h['request-method']).toStrictEqual('POST');
      const data = [
        ['text', 'あいうえお'],
        ['checkbox', 'bbb'],
        ['tweet.x', 0],
        ['tweet.y', 0]
      ]
        .map((v) => `${encodeURIComponent(v[0])}=${encodeURIComponent(v[1])}`)
        .join('&');
      expect(h['post-data']).toStrictEqual(data);
      expect(typeOf(result2.$)).toStrictEqual('function');
      expect(typeOf(result2.body)).toStrictEqual('string');
    });
  });
});

describe('submitSync', () => {
  test('フォームが同期処理で送信される', () => {
    const result1 = cli.fetchSync(`${endpoint}/form/utf-8.html`);
    const result2 = result1.$('form[name=post]').submitSync();
    expect(result2.$.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
    const h = result2.response.headers;
    expect(h['request-url']).toStrictEqual('/~info');
    expect(h['request-method']).toStrictEqual('POST');
    expect(h['post-data']).toStrictEqual('hoge=fuga');
    expect(typeOf(result2.$)).toStrictEqual('function');
    expect(typeOf(result2.body)).toStrictEqual('string');
  });

  const escapes = helper.escapedParam();
  each(helper.files('form'), (enc) => {
    describe(`URLエンコード(${enc})`, () => {
      test('デフォルトパラメータが日本語 => ページのエンコーディングに合わせたURLエンコードで送信される', () => {
        const result1 = cli.fetchSync(`${endpoint}/form/${enc}.html`);
        const result2 = result1.$('form[name=default-jp]').submitSync();
        const qp = helper.qsparse(result2.response.headers['post-data']);
        expect(Object.keys(qp).sort()).toStrictEqual([
          'checkbox',
          'radio',
          'select',
          'text',
          'textarea'
        ]);
        expect(qp.text).toStrictEqual(escapes['あいうえお'][enc]);
        expect(qp.checkbox).toStrictEqual(escapes['かきくけこ'][enc]);
        expect(qp.radio).toStrictEqual(escapes['なにぬねの'][enc]);
        expect(qp.select).toStrictEqual([escapes['ふふふふふ'][enc], escapes['ほほほほほ'][enc]]);
        expect(qp.textarea).toStrictEqual(escapes['まみむめも'][enc]);
      });

      test('上書きパラメータが日本語 => ページのエンコーディングに合わせたURLエンコードで送信される', () => {
        const set = {
          text: 'かきくけこ',
          checkbox: null,
          radio: 'たちつてと',
          select: ['ははははは', 'へへへへへ'],
          textarea: ''
        };
        const result1 = cli.fetchSync(`${endpoint}/form/${enc}.html`);
        const result2 = result1.$('form[name=default-jp]').submitSync(set);
        const qp = helper.qsparse(result2.response.headers['post-data']);
        expect(Object.keys(qp).sort()).toStrictEqual([
          'checkbox',
          'radio',
          'select',
          'text',
          'textarea'
        ]);
        expect(qp.text).toStrictEqual(escapes['かきくけこ'][enc]);
        expect(qp.checkbox).toStrictEqual('');
        expect(qp.radio).toStrictEqual(escapes['たちつてと'][enc]);
        expect(qp.select).toStrictEqual([escapes['ははははは'][enc], escapes['へへへへへ'][enc]]);
        expect(qp.textarea).toStrictEqual('');
      });

      /* eslint-disable quote-props */
      const expectedEncodings = {
        shift_jis: 'utf-8',
        'euc-jp': 'shift_jis',
        'utf-8': 'euc-jp'
      };
      /* eslint-enable quote-props */
      test(`accept-chaset属性あり => accept-charsetで指定されたURLエンコードで送信される(${expectedEncodings[enc]})`, () => {
        const param = { q: 'かきくけこ' };
        const result1 = cli.fetchSync(`${endpoint}/form/${enc}.html`);
        const result2 = result1.$('form[name=charset]').submitSync(param);
        const actual = result2.response.headers['request-url'];
        const expected = `/~info?q=${escapes[param.q][expectedEncodings[enc]]}`;
        expect(actual).toStrictEqual(expected);
      });

      test(`accept-chaset属性あり(複数) => accept-charsetで指定された先頭のURLエンコードで送信される(${expectedEncodings[enc]})`, () => {
        const param = { q: 'さしすせそ' };
        const result1 = cli.fetchSync(`${endpoint}/form/${enc}.html`);
        const result2 = result1.$('form[name="multi-charset"]').submitSync(param);
        const actual = result2.response.headers['request-url'];
        const expected = `/~info?q=${escapes[param.q][expectedEncodings[enc]]}`;
        expect(actual).toStrictEqual(expected);
      });
    });
  });

  test('fetch(callback)からのsubmitSync => 非同期 -> 同期の流れでフォーム送信される', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const result = $('form[name=post]').submitSync();
        expect(result.$.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
        const h = result.response.headers;
        expect(h['request-url']).toStrictEqual('/~info');
        expect(h['request-method']).toStrictEqual('POST');
        expect(h['post-data']).toStrictEqual('hoge=fuga');
        expect(typeOf(result.$)).toStrictEqual('function');
        expect(typeOf(result.body)).toStrictEqual('string');
        resolve();
      });
    });
  });

  test('fetch(promise)からのclickSync => 非同期 -> 同期の流れでリンク先を取得する', () => {
    return cli.fetch(`${endpoint}/form/utf-8.html`).then((result1) => {
      const result2 = result1.$('form[name=post]').submitSync();
      expect(result2.$.documentInfo().url).toStrictEqual(`${endpoint}/~info`);
      const h = result2.response.headers;
      expect(h['request-url']).toStrictEqual('/~info');
      expect(h['request-method']).toStrictEqual('POST');
      expect(h['post-data']).toStrictEqual('hoge=fuga');
      expect(typeOf(result2.$)).toStrictEqual('function');
      expect(typeOf(result2.body)).toStrictEqual('string');
    });
  });

  test('実行前エラーが同期で実行される', () => {
    const result1 = cli.fetchSync(`${endpoint}/form/utf-8.html`);
    const result2 = result1.$('a').submitSync();
    expect(Object.keys(result2)).toStrictEqual(['error']);
    expect(result2.error.message).toStrictEqual('element is not form');
  });

  test('実行後エラーが同期で実行される', () => {
    const result1 = cli.fetchSync(`${endpoint}/form/utf-8.html`);
    const result2 = result1.$('form[name=error]').submitSync();
    expect(Object.keys(result2)).toStrictEqual(['response', 'error']);
    expect(result2.response.statusCode).toStrictEqual(404);
    expect(result2.error.message).toStrictEqual('no content');
  });

  describe('Electron', () => {
    beforeEach(() => {
      process.versions.electron = '1.0.0';
    });

    test('同期リクエストは未サポート', () => {
      expect(() => cli.fetchSync(`${endpoint}/form/utf-8.html`)).toThrow(
        'sync request is not support on Electron'
      );
    });

    test('非同期リクエストは可能', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          expect(res.statusCode).toStrictEqual(200);
          resolve();
        });
      });
    });
  });
});

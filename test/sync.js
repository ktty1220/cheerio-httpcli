/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jscs:disable requireDotNotation*/
/*jshint -W100*/
var assert = require('power-assert');
var typeOf = require('type-of');
var each   = require('foreach');
var helper = require('./_helper');
var cli    = require('../index');

/**
 * 処理内容は非同期版の処理を使いまわしているので詳細なテストは省略
 * 同期処理の実行確認がメイン
 */
describe('fetchSync', function () {
  it('同期リクエストが実行される', function () {
    var result = cli.fetchSync(helper.url('auto', 'utf-8'));
    assert.deepEqual(Object.keys(result).sort(), [ '$', 'body', 'response' ]);
    assert(typeOf(result) === 'object');
    assert(typeOf(result.response) === 'object');
    assert.deepEqual(
      Object.keys(result.response).sort(),
      [ 'body', 'cookies', 'headers', 'request', 'statusCode' ]
    );
    assert(typeOf(result.$) === 'function');
    assert(typeOf(result.body) === 'string');
    assert(result.$('title').text() === '夏目漱石「私の個人主義」');
  });

  it('パラメータの指定がURLに反映されている', function () {
    var param = { hoge: 'fuga', piyo: 999, doya: true };
    var result = cli.fetchSync(helper.url('~info'), param);
    assert.deepEqual(Object.keys(result).sort(), [ '$', 'body', 'response' ]);
    assert(result.response.headers['request-url'] === '/~info?hoge=fuga&piyo=999&doya=true');
  });

  it('クッキーがセットされている & 変更不可', function () {
    var result = cli.fetchSync(helper.url('~info'));
    var res = result.response;
    assert(typeOf(res.cookies) === 'object');
    assert(res.cookies.session_id === 'hahahaha');
    assert(res.cookies.login === '1');
    res.cookies.session_id = 'fooooooo';
    assert(res.cookies.session_id === 'hahahaha');
  });

  it('encodeの指定が反映される', function () {
    var url = helper.url('unknown', 'shift_jis');
    var result = cli.fetchSync(url, {}, 'sjis');
    assert.deepEqual(result.$.documentInfo(), {
      url: url,
      encoding: 'sjis',
      isXml: false
    });
    assert(result.$('title').text() === '１');
  });

  it('encodeの指定が反映される(param省略)', function () {
    var url = helper.url('unknown', 'shift_jis');
    var result = cli.fetchSync(url, 'sjis');
    assert.deepEqual(result.$.documentInfo(), {
      url: url,
      encoding: 'sjis',
      isXml: false
    });
    assert(result.$('title').text() === '１');
  });

  it('エラー => エラー内容を取得できる', function () {
    var url = helper.url('~404');
    var result = cli.fetchSync(url, { hoge: 'fuga' });
    var err = result.error;
    assert(err.message === 'server status');
    assert(err.statusCode === 404);
    assert(err.url === url);
    assert.deepEqual(err.param, { hoge: 'fuga' });
    assert(result.$('title').text(), 'ページが見つかりません');
    assert(result.body.length > 0);
  });

  it('タイムアウトの値を超えるとエラーになる', function () {
    cli.set('timeout', 300);
    var url = helper.url('~slow');
    var result = cli.fetchSync(url);
    var err = result.error;
    assert(helper.isTimedOut(err));
    assert(! err.statusCode);
    assert(err.url === url);
    assert(! result.body);
  });
});

describe('clickSync(a要素)', function () {
  it('fetchSyncからのclickSync => 順番に同期処理でリンク先を取得する', function () {
    var result1 = cli.fetchSync(helper.url('form', 'utf-8'));
    var result2 = result1.$('.rel').clickSync();
    assert.deepEqual(result2.$.documentInfo(), {
      url: helper.url('auto', 'euc-jp'),
      encoding: 'euc-jp',
      isXml: false
    });
    assert(typeOf(result2.response) === 'object');
    assert(typeOf(result2.$) === 'function');
    assert(typeOf(result2.body) === 'string');
  });

  it('fetch(callback)からのclickSync => 非同期 -> 同期の流れでリンク先を取得する', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var result = $('.rel').clickSync();
      assert.deepEqual(result.$.documentInfo(), {
        url: helper.url('auto', 'euc-jp'),
        encoding: 'euc-jp',
        isXml: false
      });
      assert(typeOf(result.response) === 'object');
      assert(typeOf(result.$) === 'function');
      assert(typeOf(result.body) === 'string');
      done();
    });
  });

  it('fetch(promise)からのclickSync => 非同期 -> 同期の流れでリンク先を取得する', function () {
    return cli.fetch(helper.url('form', 'utf-8'))
    .then(function (result1) {
      var result2 = result1.$('.root').clickSync();
      assert(result2.$.documentInfo().url === helper.url('~info') + '?hoge=fuga&piyo=');
      assert(typeOf(result2.response) === 'object');
      assert(typeOf(result2.$) === 'function');
      assert(typeOf(result2.body) === 'string');
    });
  });

  it('実行前エラーが同期で実行される', function () {
    var result1 = cli.fetchSync(helper.url('form', 'utf-8'));
    var result2 = result1.$('div').clickSync();
    assert(Object.keys(result2), [ 'error' ]);
    assert(result2.error.message === 'element is not clickable');
  });

  it('実行後エラーが同期で実行される', function () {
    var result1 = cli.fetchSync(helper.url('form', 'utf-8'));
    var result2 = result1.$('.js').clickSync();
    assert(Object.keys(result2), [ 'error' ]);
    assert(result2.error.message === 'Invalid URI "javascript:history.back();"');
  });
});

describe('clickSync(submit)', function () {
  describe('input[type=submit]要素', function () {
    it('所属しているformのsubmitを同期処理で実行する(編集ボタンのパラメータがセットされる)', function () {
      var result1 = cli.fetchSync(helper.url('form', 'utf-8'));
      var result2 = result1.$('form[name="multi-submit"] input[name=edit]').clickSync();
      assert(! result2.error);
      assert(result2.$.documentInfo().url === helper.url('~info'));
      var h = result2.response.headers;
      assert(h['request-url'] === '/~info');
      assert(h['request-method'] === 'POST');
      var data = [
        [ 'text', 'あいうえお' ],
        [ 'checkbox', 'bbb' ],
        [ 'edit', '編集' ]
      ].map(function (v, i, a) {
        return encodeURIComponent(v[0]) + '=' + encodeURIComponent(v[1]);
      }).join('&');
      assert(h['post-data'] === data);
      assert(typeOf(result2.$) === 'function');
      assert(typeOf(result2.body) === 'string');
    });
  });

  describe('button[type=submit]要素', function () {
    it('所属しているformのsubmitを同期処理で実行する(削除ボタンのパラメータがセットされる)', function () {
      var result1 = cli.fetchSync(helper.url('form', 'utf-8'));
      var result2 = result1.$('form[name="multi-submit"] button[name=delete]').clickSync();
      assert(! result2.error);
      assert(result2.$.documentInfo().url === helper.url('~info'));
      var h = result2.response.headers;
      assert(h['request-url'] === '/~info');
      assert(h['request-method'] === 'POST');
      var data = [
        [ 'text', 'あいうえお' ],
        [ 'checkbox', 'bbb' ],
        [ 'delete', '削除' ]
      ].map(function (v, i, a) {
        return encodeURIComponent(v[0]) + '=' + encodeURIComponent(v[1]);
      }).join('&');
      assert(h['post-data'] === data);
      assert(typeOf(result2.$) === 'function');
      assert(typeOf(result2.body) === 'string');
    });
  });

  describe('input[type=image]要素', function () {
    it('所属しているformのsubmitを同期処理で実行する(パラメータとしてx,y座標がセットされる)', function () {
      var result1 = cli.fetchSync(helper.url('form', 'utf-8'));
      var result2 = result1.$('form[name="multi-submit"] input[name=tweet]').clickSync();
      assert(! result2.error);
      assert(result2.$.documentInfo().url === helper.url('~info'));
      var h = result2.response.headers;
      assert(h['request-url'] === '/~info');
      assert(h['request-method'] === 'POST');
      var data = [
        [ 'text', 'あいうえお' ],
        [ 'checkbox', 'bbb' ],
        [ 'tweet.x', 0 ],
        [ 'tweet.y', 0 ]
      ].map(function (v, i, a) {
        return encodeURIComponent(v[0]) + '=' + encodeURIComponent(v[1]);
      }).join('&');
      assert(h['post-data'] === data);
      assert(typeOf(result2.$) === 'function');
      assert(typeOf(result2.body) === 'string');
    });
  });
});

describe('submitSync', function () {
  it('フォームが同期処理で送信される', function () {
    var result1 = cli.fetchSync(helper.url('form', 'utf-8'));
    var result2 = result1.$('form[name=post]').submitSync();
    assert(result2.$.documentInfo().url === helper.url('~info'));
    var h = result2.response.headers;
    assert(h['request-url'] === '/~info');
    assert(h['request-method'] === 'POST');
    assert(h['post-data'] === 'hoge=fuga');
    assert(typeOf(result2.$) === 'function');
    assert(typeOf(result2.body) === 'string');
  });

  var escapes = helper.escapedParam();
  each(helper.files('form'), function (enc) {
    describe('URLエンコード(' + enc + ')', function () {
      it('デフォルトパラメータが日本語 => ページのエンコーディングに合わせたURLエンコードで送信される', function () {
        var result1 = cli.fetchSync(helper.url('form', enc));
        var result2 = result1.$('form[name=default-jp]').submitSync();
        var qp = helper.qsparse(result2.response.headers['post-data']);
        assert.deepEqual(Object.keys(qp).sort(), [
          'checkbox', 'radio', 'select', 'text', 'textarea'
        ]);
        assert(qp.text === escapes['あいうえお'][enc]);
        assert(qp.checkbox === escapes['かきくけこ'][enc]);
        assert(qp.radio === escapes['なにぬねの'][enc]);
        assert.deepEqual(qp.select, [ escapes['ふふふふふ'][enc], escapes['ほほほほほ'][enc] ]);
        assert(qp.textarea === escapes['まみむめも'][enc]);
      });

      it('上書きパラメータが日本語 => ページのエンコーディングに合わせたURLエンコードで送信される', function () {
        var set = {
          text: 'かきくけこ',
          checkbox: null,
          radio: 'たちつてと',
          select: [ 'ははははは', 'へへへへへ' ],
          textarea: ''
        };
        var result1 = cli.fetchSync(helper.url('form', enc));
        var result2 = result1.$('form[name=default-jp]').submitSync(set);
        var qp = helper.qsparse(result2.response.headers['post-data']);
        assert.deepEqual(Object.keys(qp).sort(), [
          'checkbox', 'radio', 'select', 'text', 'textarea'
        ]);
        assert(qp.text === escapes['かきくけこ'][enc]);
        assert(qp.checkbox === '');
        assert(qp.radio === escapes['たちつてと'][enc]);
        assert.deepEqual(qp.select, [ escapes['ははははは'][enc], escapes['へへへへへ'][enc] ]);
        assert(qp.textarea === '');
      });

      /*jscs:disable disallowQuotedKeysInObjects*/
      /*eslint-disable quote-props*/
      var expectedEncodings = {
        'shift_jis': 'utf-8',
        'euc-jp': 'shift_jis',
        'utf-8': 'euc-jp'
      };
      /*jscs:enable disallowQuotedKeysInObjects*/
      /*eslint-enable quote-props*/
      it('accept-chaset属性あり => accept-charsetで指定されたURLエンコードで送信される(' + expectedEncodings[enc] + ')', function () {
        var param = { q: 'かきくけこ' };
        var result1 = cli.fetchSync(helper.url('form', enc));
        var result2 = result1.$('form[name=charset]').submitSync(param);
        var actual = result2.response.headers['request-url'];
        var expected = '/~info?q=' + escapes[param.q][expectedEncodings[enc]];
        assert(actual === expected);
      });
    });
  });

  it('fetch(callback)からのsubmitSync => 非同期 -> 同期の流れでフォーム送信される', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var result = $('form[name=post]').submitSync();
      assert(result.$.documentInfo().url === helper.url('~info'));
      var h = result.response.headers;
      assert(h['request-url'] === '/~info');
      assert(h['request-method'] === 'POST');
      assert(h['post-data'] === 'hoge=fuga');
      assert(typeOf(result.$) === 'function');
      assert(typeOf(result.body) === 'string');
      done();
    });
  });

  it('fetch(promise)からのclickSync => 非同期 -> 同期の流れでリンク先を取得する', function () {
    return cli.fetch(helper.url('form', 'utf-8'))
    .then(function (result1) {
      var result2 = result1.$('form[name=post]').submitSync();
      assert(result2.$.documentInfo().url === helper.url('~info'));
      var h = result2.response.headers;
      assert(h['request-url'] === '/~info');
      assert(h['request-method'] === 'POST');
      assert(h['post-data'] === 'hoge=fuga');
      assert(typeOf(result2.$) === 'function');
      assert(typeOf(result2.body) === 'string');
    });
  });

  it('実行前エラーが同期で実行される', function () {
    var result1 = cli.fetchSync(helper.url('form', 'utf-8'));
    var result2 = result1.$('a').submitSync();
    assert(Object.keys(result2), [ 'error' ]);
    assert(result2.error.message === 'element is not form');
  });

  it('実行後エラーが同期で実行される', function () {
    var result1 = cli.fetchSync(helper.url('form', 'utf-8'));
    var result2 = result1.$('form[name=error]').submitSync();
    assert(Object.keys(result2), [ 'error' ]);
    assert(result2.error.message === 'no content');
  });

  describe('Electron', function () {
    beforeEach(function () {
      process.versions.electron = '1.0.0';
    });

    it('同期リクエストは未サポート', function () {
      try {
        cli.fetchSync(helper.url('form', 'utf-8'));
        throw new Error('not thrown');
      } catch (e) {
        assert(e.message === 'sync request is not support on Electron');
      }
    });

    it('非同期リクエストは可能', function () {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        assert(res.statusCode === 200);
      });
    });
  });
});

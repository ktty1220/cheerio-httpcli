/*eslint no-invalid-this:0*/
'use strict';

var cheerio   = require('cheerio');
var util      = require('util');
var assert    = require('assert');
var urlParser = require('url');

/**
 * cheerioオブジェクト拡張モジュール(プロトタイプにメソッド追加)
 */
module.exports = function (encoding, client) {
  /**
   * a要素のリンクのクリックをエミュレート(リンク先のページを取得)
   *
   * @param callback リクエスト完了時のコールバック関数(err, response, body(buffer))
   */
  var documentInfo = function () {
    // cheerio/lib/static.jsによると大元の_rootは_originalRootという名称で保持されているらしい
    return this._root[0]._documentInfo || this._originalRoot._documentInfo;
  };

  cheerio.prototype.click = function (callback) {
    var doc = documentInfo.call(this);
    var $ = cheerio;
    var $link = null;

    // a要素でなければエラー
    try {
      assert.ok(this.length > 0);
      // 複数ある場合は先頭のリンクのみ
      $link = $(this[0]);
      assert.ok($link.is('a'));
    } catch (e) {
      return client.error('element is not link', {
        param: { uri: doc.url },
        callback: callback
      });
    }

    var url = urlParser.resolve(doc.url, $link.attr('href'));
    return client.run('GET', url, callback);
  };

  /**
   * form要素からの送信をエミュレート
   *
   * @param param    疑似設定するフォーム送信パラメータ
   * @param callback リクエスト完了時のコールバック関数(err, response, body(buffer))
   */
  cheerio.prototype.submit = function (param, callback) {
    if (param instanceof Function) {
      callback = param;
      param = {};
    }
    param = param || {};

    var doc = documentInfo.call(this);
    var $ = cheerio;
    var $form = null;

    // form要素でなければエラー
    try {
      assert.ok(this.length > 0);
      // 複数ある場合は先頭のフォームのみ
      $form = $(this[0]);
      assert.ok($form.is('form'));
    } catch (e) {
      return client.error('element is not form', {
        param: { uri: doc.url },
        callback: callback
      });
    }

    // フォーム送信パラメータ作成
    var formParam = {};
    $form.find('input,textarea,select').each(function (idx) {
      var name = $(this).attr('name');
      var type = $(this).attr('type');
      var value = $(this).val();
      if (! name) {
        return;
      }
      formParam[name] = formParam[name] || [];
      if (/(checkbox|radio)/i.test(type) && ! $(this).attr('checked')) {
        return;
      }
      if (util.isArray(value)) {
        formParam[name] = formParam[name].concat(value);
      } else {
        formParam[name].push(value);
      }
    });

    // フォーム内のデフォルトパラメータを引数で指定したパラメータで上書き
    Object.keys(param).forEach(function (p) {
      if (typeof param[p] !== 'number' && ! param[p]) {
        param[p] = '';
      }
      formParam[p] = (util.isArray(param[p])) ? param[p] : [ param[p] ];
    });

    // 空パラメータでもname=のみで送信するための仕込み
    Object.keys(formParam).forEach(function (p) {
      if (formParam[p].length === 0) {
        formParam[p].push('');
      }
    });

    // 各種エンコーディングに対応したURLエンコードをする必要があるのでパラメータ文字列を自力で作成
    var formParamStr = '';
    Object.keys(formParam).forEach(function (p) {
      var fp = formParam[p];
      for (var i = 0; i < fp.length; i++) {
        var escName = encoding.escape(doc.encoding, p);
        var escVal = encoding.escape(doc.encoding, fp[i] != null ? fp[i] : '');
        formParamStr += '&' + escName + '=' + escVal;
      }
    });
    if (formParamStr.length > 0) {
      formParamStr = formParamStr.substr(1);
    }

    var url = urlParser.resolve(doc.url, $form.attr('action') || '');
    var method = ($form.attr('method') || 'GET').toUpperCase();
    // GETの場合はURLに繋げてパラメータを空にする(そうしないと上手く動かないケースがたまにあった)
    if (method === 'GET') {
      var join = (url.indexOf('?') === -1) ? '?' : '&';
      if (formParamStr.length > 0) {
        url += join + formParamStr;
      }
      formParamStr = {};
    }
    return client.run(method, url, formParamStr, callback);
  };

  return cheerio;
};

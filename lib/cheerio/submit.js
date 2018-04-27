/*jshint -W100*/

'use strict';

var urlParser = require('url');
var typeOf    = require('type-of');
var each      = require('foreach');
var cutil     = require('./util');

module.exports = function (encoding, client, cheerio) {
  /**
   * form要素からの送信をエミュレート
   *
   * @param param    疑似設定するフォーム送信パラメータ
   * @param callback リクエスト完了時のコールバック関数(err, response, body(buffer))
   */
  var emulateSubmit = function (elem, param, callback) {
    if (param === 'sync' || typeOf(param) === 'function') {
      callback = param;
      param = {};
    }
    param = param || {};

    var doc = cutil.documentInfo(elem);
    var $form = null;

    // form要素でなければエラー
    try {
      if (elem.length === 0) {
        throw new Error('no elements');
      }

      // 複数ある場合は先頭のフォームのみ
      $form = elem.eq(0);
      if (! $form.is('form')) {
        throw new Error('element is not form');
      }
    } catch (e) {
      return client.error(e.message, {
        param: { uri: doc.url },
        callback: callback
      });
    }

    // methodとURL確定
    var method = ($form.attr('method') || 'GET').toUpperCase();
    var url = urlParser.resolve(doc.url, $form.attr('action') || '');

    // フォーム送信パラメータ作成
    // 1. デフォルトパラメータ($form.field())を取得した後に
    // 2. 引数で指定したパラメータ(param)で上書き
    var formParam = {};
    each([ $form.field(), param ], function (fp) {
      each(fp, function (val, name) {
        var fparam = cutil.paramFilter(val);
        var fvalue = (typeOf(fparam) === 'array') ? fparam : [ fparam ];
        // 空パラメータでもname=のみで送信するための仕込み
        if (fvalue.length === 0) {
          fvalue.push('');
        }
        formParam[name] = fvalue;
      });
    });

    // 各種エンコーディングに対応したURLエンコードをする必要があるのでパラメータ文字列を自力で作成
    var formParamArray = [];
    // accept-charsetは先頭で指定されているものを使用
    var enc = ($form.attr('accept-charset') || doc.encoding).split(/[\s,]+/)[0];
    each(formParam, function (val, name) {
      formParamArray.push(val.map(function (vv) {
        var escName = encoding.escape(enc, name);
        var escVal = encoding.escape(enc, vv);
        if (method === 'POST') {
          // application/x-www-form-urlencodedでは半角スペースは%20ではなく+にする
          escName = escName.replace(/%20/g, '+');
          escVal = escVal.replace(/%20/g, '+');
        }
        return escName + '=' + escVal;
      }).join('&'));
    });
    var formParamStr = formParamArray.join('&');

    // GETの場合はURLに繋げてパラメータを空にする(そうしないと上手く動かないケースがたまにあった)
    if (method === 'GET') {
      var join = (url.indexOf('?') === -1) ? '?' : '&';
      if (formParamStr.length > 0) {
        url += join + formParamStr;
      }
      formParamStr = {};
    }

    return client.run(method, url, formParamStr, null, callback);
  };

  /**
   * 非同期フォーム送信
   */
  cheerio.prototype.submit = function (param, callback) {
    return emulateSubmit(this, param, callback);
  };

  /**
   * 同期フォーム送信
   */
  cheerio.prototype.submitSync = function (param) {
    return emulateSubmit(this, param, 'sync');
  };
};

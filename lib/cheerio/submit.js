/*eslint no-invalid-this:0*/
'use strict';

var util      = require('util');
var urlParser = require('url');
var cutil     = require('./util');

module.exports = function (encoding, client, cheerio) {
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

    var doc = cutil.documentInfo(this);
    var $ = cheerio;
    var $form = null;

    // form要素でなければエラー
    try {
      if (this.length === 0) {
        throw new Error('no elements');
      }

      // 複数ある場合は先頭のフォームのみ
      $form = this.eq(0);
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
    var formParam = {};
    $form.find('input,textarea,select').each(function (idx) {
      var $e = $(this);
      var name = $e.attr('name');
      var type = $e.attr('type');
      var value = $e.val() || $e.attr('value');
      if (! name) {
        return;
      }
      // submit系要素はjavascriptでform.submit()した時にはパラメータとして付加しない
      // (ブラウザと同じ挙動)
      if ([ 'submit', 'image' ].indexOf(type) !== -1) {
        return;
      }
      formParam[name] = formParam[name] || [];
      if (/(checkbox|radio)/i.test(type) && ! $e.attr('checked')) {
        return;
      }
      if (util.isArray(value)) {
        formParam[name] = formParam[name].concat(value);
      } else {
        formParam[name].push(cutil.paramFilter(value));
      }
    });

    // フォーム内のデフォルトパラメータを引数で指定したパラメータで上書き
    Object.keys(param).forEach(function (p) {
      var fparam = cutil.paramFilter(param[p]);
      formParam[p] = (util.isArray(fparam)) ? fparam : [ fparam ];
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
        var escVal = encoding.escape(doc.encoding, fp[i]);
        if (method === 'POST') {
          // application/x-www-form-urlencodedでは半角スペースは%20ではなく+にする
          escName = escName.replace(/%20/g, '+');
          escVal = escVal.replace(/%20/g, '+');
        }
        formParamStr += '&' + escName + '=' + escVal;
      }
    });
    if (formParamStr.length > 0) {
      formParamStr = formParamStr.substr(1);
    }

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
};

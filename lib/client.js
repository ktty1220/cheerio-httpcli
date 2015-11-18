/*eslint key-spacing:0, no-undefined:0, dot-notation:0*/
'use strict';

var request    = require('request');
var urlParser  = require('url');
var zlib       = require('zlib');
var RSVP       = require('rsvp');
var each       = require('foreach');
var typeOf     = require('type-of');
var assign     = require('object-assign');
var prettyjson = require('prettyjson');
var osLocale   = require('os-locale');
var constants  = require('constants');


// クッキー設定
var jar = request.jar();
request.defaults({ jar: jar });

/**
 * http(s)リクエスト処理メインモジュール
 */
module.exports = {
  /**
   * プロパティ
   */

  core     : null,  // cheerio-httpcli本体
  encoding : null,  // encodingモジュール
  cheerio  : null,  // 拡張cheerioオブジェクト

  /**
   * メソッド
   */

  /**
   * promise/callbackに両対応したエラー終了処理(promise実行後)
   *
   * @param err     Errorオブジェクトもしくはエラーメッセージ文字列
   * @param options prepareで作成したオプション情報
   * @param extra   Errorオブジェクトに追加する情報
   * @param result  処理結果オブジェクト
   * @param reject  (promise処理時のみ)reject関数
   */
  fail: function (err, options, extra, result, reject) {
    extra = extra || {};
    result = result || {};
    var error = (err instanceof Error) ? err : new Error(err);
    if (options.param.uri) {
      error.url = options.param.uri;
    }
    if (options.param.form) {
      error.param = options.param.form;
    } else if (options.param.qs) {
      error.param = options.param.qs;
    }
    each(extra, function (exVal, exKey) {
      if (typeOf(exVal) !== 'undefined') {
        error[exKey] = exVal;
      }
    });

    // promise処理時とcallback処理時で処理の返し方を切り替え
    if (typeOf(options.callback) === 'function') {
      options.callback(error, result.$, result.response, result.body);
    } else {
      each(result, function (val, name) {
        if (typeOf(val) !== 'undefined') {
          error[name] = val;
        }
      });
      reject(error);
    }
  },

  /**
   * promise/callbackに両対応したエラー終了処理(promise実行前)
   *
   * @param err     Errorオブジェクトもしくはエラーメッセージ文字列
   * @param options prepareで作成したオプション情報
   * @param extra   Errorオブジェクトに追加する情報
   * @param result  処理結果オブジェクト
   * @param reject  (promise処理時のみ)reject関数
   */
  error: function (err, options, extra, result) {
    extra = extra || {};
    result = result || {};
    if (typeOf(options.callback) === 'function') {
      return this.fail(err, options, extra, result);
    }

    // callbackを指定しなかった場合はpromiseオブジェクトを返す
    return new RSVP.Promise((function (resolve, reject) {
      return this.fail(err, options, extra, result, reject);
    }).bind(this));
  },

  /**
   * gzip転送に対応したリクエスト処理
   *
   * @param param    requestモジュールでのhttpアクセス時に指定するパラメータ
   * @param gzip     gzip転送をするかどうか
   * @param callback リクエスト完了時のコールバック関数(err, response, body(buffer))
   * @param retry    内部処理用引数(リトライ回数)
   */
  request: function (param, gzip, callback, retry) {
    if (gzip) {
      // gzipヘッダ追加
      param.headers['Accept-Encoding'] = 'gzip, deflate';
    }

    // デバッグ情報
    if (this.core.debug) {
      var label = '[DEBUG]';
      var debugParams = {};
      debugParams[label] = {};
      each([ 'uri', 'method', 'headers', 'qs', 'form' ], function (v) {
        if (param[v]) {
          debugParams[label][v] = param[v];
        }
      });
      var cookies = {};
      each(param.jar.getCookies(param.uri), function (c) {
        cookies[c.key] = c.value;
      });
      if (Object.keys(cookies).length > 0) {
        debugParams[label].cookies = cookies;
      }
      process.stderr.write(prettyjson.render(debugParams) + '\n\n');
    }

    // レスポンスのサイズを計測するためのバッファ
    var buffer = '';

    var maxDataSize = this.core.maxDataSize;

    // リクエスト実行
    var req = request(param, (function (err, res, body) {
      if (err) {
        return callback(err, res, body);
      }

      // POSTした先でリダイレクトされてもちゃんと飛んでくれないことがあるので自力で飛ぶ
      if (/^30\d$/.test(res.statusCode) && res.headers.location) {
        retry = retry || 0;
        if (retry > 5) {
          return callback(new Error('redirect limit over'), res, body);
        }

        // パラメータの調整
        param.uri = res.headers.location;
        param.method = 'GET';
        delete(param.form);
        delete(param.qs);
        return this.request(param, gzip, callback, retry + 1);
      }

      // レスポンスヘッダを確認してコンテンツがgzip圧縮されているかどうかチェック
      var gzipped = false;
      for (var h in res.headers) {
        if (h.toLowerCase() === 'content-encoding' && res.headers[h].toLowerCase() === 'gzip') {
          gzipped = true;
          break;
        }
      }

      if (gzipped) {
        // gzip化されているコンテンツを解凍したものをセットしてコールバック
        zlib.unzip(body, function (err, buf) {
          callback(err, res, buf);
        });
      } else {
        return callback(undefined, res, body);
      }
    }).bind(this)).on('data', function (chunk) {
      if (maxDataSize !== null) {
        // バッファにチャンクを追加
        buffer += chunk;

        // 制限を超過したら中止
        if (buffer.length > maxDataSize) {
          req.abort();
          return callback(new Error('data size limit over'));
        }
      }
    });
  },

  /**
   * http通信処理本体
   *
   * @param options prepareで作成したオプション情報
   * @param resolve (promise処理時のみ)resolve関数
   * @param reject  (promise処理時のみ)reject関数
   */
  execute: function (options, resolve, reject) {
    // 処理結果格納先
    var result = {};

    // リクエスト実行
    this.request(options.param, options.gzip, (function (err, res, body) {
      // クッキー取得
      if (res) {
        res.cookies = {};
        each(options.param.jar.getCookies(options.param.uri), function (c) {
          res.cookies[c.key] = c.value;
        });
      }

      result.response = res;

      if (err) {
        return this.fail(err, options, {}, result, reject);
      }
      if ((body || []).length === 0) {
        return this.fail('no content', options, { statusCode: res.statusCode }, result, reject);
      }

      // Buffer状態のHTMLコンテンツからエンコーディングを判定してUTF-8に変換
      var enc = options.encode || this.encoding.detect(body);
      if (enc) {
        enc = enc.toLowerCase();
        try {
          body = this.encoding.convert(enc, body);
        } catch (e) {
          return this.fail(e, options, { charset: enc }, result, reject);
        }
      }
      result.body = body.toString('utf8');

      // cheerioでHTMLコンテンツをパース & 現在のページ情報を追加
      result.$ = this.cheerio.load(result.body, { decodeEntities: true });
      result.$._root._documentInfo = {
        url: res.request.uri.href,
        encoding: enc
      };
      result.$.documentInfo = function () {
        return this._root._documentInfo;
      };

      // HTMLが取得できてもレスポンスステータスが200でない場合(ソフト404など)はエラーとして処理する
      if (res.statusCode !== 200) {
        return this.fail('server status', options, { statusCode: res.statusCode }, result, reject);
      }

      if (options.referer) {
        // 次のリクエスト時に今アクセスしたURLをRefererとする
        options.headers.Referer = result.$._root._documentInfo.url;
      }

      // promise処理時とcallback処理時で処理の返し方を切り替え
      if (typeOf(options.callback) === 'function') {
        options.callback(result.error, result.$, result.response, result.body);
      } else {
        resolve(result);
      }
    }).bind(this));
  },

  /**
   * デフォルトのリクエストヘッダに指定したヘッダが存在するかチェック
   *
   * @param header  リクエストヘッダ名
   * @return true or false
   */
  hasHeader: function (header) {
    header = header.toLowerCase();
    return (Object.keys(this.core.headers).filter(function (h) {
      return (h.toLowerCase() === header);
    }).length > 0);
  },

  /**
   * リクエスト時に必要なオプション情報を作成
   *
   * @param method   リクエストメソッド
   * @param url      リクエスト先のURL
   * @param param    リクエストパラメータ
   * @param encode   取得先のHTMLのエンコーディング(default: 自動判定)
   * @param callback リクエスト完了時のコールバック関数(err, cheerio, response, body)
   * @return オプション情報オブジェクト
   */
  prepare: function (method, url, param, encode, callback) {
    // 省略されている引数に合わせて調整
    if (typeOf(encode) === 'function') {
      callback = encode;
      encode = undefined;
    } else if (typeOf(param) === 'function') {
      callback = param;
      param = undefined;
      encode = undefined;
    }

    var cli = this.core;

    // デフォルトはChromeとして振る舞う
    if (! this.hasHeader('User-Agent')) {
      cli.setBrowser('chrome');
    }

    // OSのロケールからAcceptLanguageを設定
    if (! this.hasHeader('Accept-Language')) {
      try {
        // spawn: trueだとexecFileSyncを使うのでできればfalseにしたいが
        // windowsだとロケールを取得できる確実な環境変数がなさそう
        var locale = osLocale.sync({ spawn: (process.platform === 'win32') });
        if (locale) {
          locale = locale.replace(/_/g, '-');
          // en-USだとロケール取得に失敗した可能性があるので何もしない
          if (locale !== 'en-US') {
            cli.headers['Accept-Language'] = locale.replace(/_/g, '-') + ',en-US';
          }
        }
      } catch (e) {
        // ロケールが取得できない場合は何もしない
      }
    }

    // Acceptヘッダにそれっぽいのを付加しておく
    if (! this.hasHeader('Accept')) {
      /*jscs:disable requireDotNotation*/
      cli.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
      /*jscs:enable requireDotNotation*/
    }

    // リクエストヘッダ作成
    var parsed = urlParser.parse(url);
    var reqHeader = assign({ Host: parsed.host }, cli.headers);

    var options = {
      param: {
        uri: url,
        method: method,
        encoding: null,  // Bufferでコンテンツを取得する
        headers: reqHeader,
        timeout: cli.timeout,
        followRedirect: true,
        jar: jar,
        secureOptions: constants.SSL_OP_NO_TLSv1_2  // とりあえず付けてみた
      },
      headers: cli.headers,
      gzip: cli.gzip,
      referer: cli.referer,
      encode: encode,
      callback: callback
    };

    if ((typeOf(param) === 'object' && Object.keys(param).length > 0) || (param || '').length > 0) {
      options.param[(method === 'GET') ? 'qs' : 'form'] = param;
    }

    return options;
  },

  /**
   * リクエスト処理スタート
   *
   * @param method   リクエストメソッド
   * @param url      リクエスト先のURL
   * @param param    リクエストパラメータ
   * @param encode   取得先のHTMLのエンコーディング(default: 自動判定)
   * @param callback リクエスト完了時のコールバック関数(err, cheerio, response, body)
   */
  run: function (method, url, param, encode, callback) {
    var options = this.prepare(method, url, param, encode, callback);
    if (! (typeOf(options.callback) === 'function')) {
      // callbackを指定しなかった場合はpromiseオブジェクトを返す
      return new RSVP.Promise((function (resolve, reject) {
        this.execute(options, resolve, reject);
      }).bind(this));
    }
    this.execute(options);
  }
};

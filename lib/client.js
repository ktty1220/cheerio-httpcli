/*eslint key-spacing:0, dot-notation:0*/
'use strict';

var request         = require('request');
var urlParser       = require('url');
var zlib            = require('zlib');
var RSVP            = require('rsvp');
var each            = require('foreach');
var typeOf          = require('type-of');
var assign          = require('object-assign');
var prettyjson      = require('prettyjson');
var constants       = require('constants');
var spawnSync       = require('spawn-sync');
var which           = require('which');
var path            = require('path');
// os-localeは最初に実行した段階で結果をcacheに持つので
// fetch()前に別のモジュールがos-localeを実行していた場合に
// オプション内容によっては予期しない結果が返ることがある
var requireUncached = require('require-uncached');
var osLocale        = requireUncached('os-locale');


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

  core     : null,     // cheerio-httpcli本体
  encoding : null,     // encodingモジュール
  cheerio  : null,     // 拡張cheerioオブジェクト
  engine   : request,  // requestモジュール

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

    // callback形式
    if (typeOf(options.callback) === 'function') {
      return options.callback(error, result.$, result.response, result.body);
    }

    // promise形式
    if (reject) {
      each(result, function (val, name) {
        if (typeOf(val) !== 'undefined') {
          error[name] = val;
        }
      });
      return reject(error);
    }

    // 同期処理
    result.error = error;
    return result;
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

    // callback形式 or 同期処理
    if (typeOf(options.callback) === 'function' || options.callback === 'sync') {
      return this.fail(err, options, extra, result);
    }

    // promise形式(promiseオブジェクトを返す)
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
        return callback(null, res, body);
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

    return req;
  },

  /**
   * 非同期http通信処理本体
   *
   * @param options prepareで作成したオプション情報
   * @param resolve (promise処理時のみ)resolve関数
   * @param reject  (promise処理時のみ)reject関数
   */
  execute: function (options, resolve, reject) {
    // リクエスト実行
    this.request(options.param, options.gzip, (function (err, res, body) {
      // レスポンスから処理結果オブジェクト作成
      var obj = this.responseToResult(err, res, body, options);
      if (obj.err) {
        return this.fail(obj.err, options, obj.extra, obj.result, reject);
      }

      // promise処理時とcallback処理時で処理の返し方を切り替え
      var result = obj.result;
      if (typeOf(options.callback) === 'function') {
        options.callback(result.error, result.$, result.response, result.body);
      } else {
        resolve(result);
      }
    }).bind(this));
  },

  /**
   * PATHから実行ファイルを探す
   *
   * @param exe 実行ファイル名(node、iojs等)の配列(前から順番に探す)
   * @return 実行ファイルのフルパス or null
   */
  findExe: function (exes) {
    for (var i = 0; i < exes.length; i++) {
      try {
        return which.sync(exes[i]);
      } catch (e) {
        // 見つからなかった
      }
    }
  },

  /**
   * 同期http通信処理本体
   *
   * @param options prepareで作成したオプション情報
   * @return リクエスト処理結果オブジェクト
   *         {
   *           err:      request処理結果のerr
   *           $:        request処理結果のbodyをcheerioでパースしたオブジェクト
   *           response: toJSON()したrequest処理結果のres
   *           body:     UTF-8化したrequest処理結果のbody
   *         }
   */
  executeSync: function (options) {
    var args = {
      param: options.param,
      core: {},
      cookies: {}
    };

    // jarはJSON化せず別途cookie付加
    each(options.param.jar.getCookies(options.param.uri), function (c) {
      args.cookies[c.key] = c.value;
    });
    delete(args.param.jar);

    // workerに渡すcoreオプション取得
    each(this.core, function (val, key) {
      if (typeOf(val) !== 'function') {
        args.core[key] = val;
      }
    });

    // spawnSyncでworker.jsでリクエスト処理を行う
    var result = null;
    var message = null;
    var json = {};

    var node = this.findExe([ 'node', 'nodejs', 'iojs' ]);
    if (! node) {
      message = 'Could not found node or iojs in PATH';
    } else {
      var worker = [ path.join(__dirname, 'worker.js') ];
      result = spawnSync(node, worker, {
        input: JSON.stringify(args),
        encoding: 'utf-8'
      });
      message = (result.status === 0) ? result.stderr : null;

      // worker.jsが出力したJSONを取得して処理結果オブジェクトを作成
      try {
        json = JSON.parse(result.stdout);
      } catch (e) {
        message = 'An error occurred during the sync request';
      }
    }

    // worker.jsのjarが取得したcookieをこちらのjarにセット
    var Cookie = require('tough-cookie').Cookie;
    if (json.response && typeOf(json.cookies) === 'array') {
      each(json.cookies, function (c) {
        jar.setCookie(Cookie.fromJSON(c).toString(), json.response.request.uri.href);
      });
    }
    options.param.jar = jar;

    var err = (message) ? new Error(message) : null;
    var body = (json.body) ? new Buffer(json.body) : null;
    var obj = this.responseToResult(err, json.response, body, options);
    if (obj.err) {
      return this.fail(obj.err, options, obj.extra, obj.result);
    }
    return obj.result;
  },

  /**
   * request処理で取得したresponoseオブジェクトから処理結果オブジェクト作成
   *
   * @param err     request処理結果のerr
   * @param res     request処理結果のres
   * @param body    request処理結果のbody
   * @param options prepareで作成したオプション情報
   * @return 処理結果オブジェクトおよび処理過程で発生したエラー情報
   *         {
   *           err:    エラーオブジェクト or エラー文字列
   *           extra:  処理結果エラーオブジェクトに付加する追加情報
   *           result: 処理結果オブジェクト
   *         }
   */
  responseToResult: function (err, res, body, options) {
    // 処理結果格納先
    var result = {};

    // クッキー取得
    if (res) {
      res.cookies = {};
      each(options.param.jar.getCookies(options.param.uri), function (c) {
        res.cookies[c.key] = c.value;
      });
      Object.freeze(res.cookies);
    }

    result.response = res;

    if (err) {
      return {
        err: err,
        result: result
      };
    }
    if ((body || []).length === 0) {
      return {
        err: 'no content',
        extra: { statusCode: res.statusCode },
        result: result
      };
    }

    // Buffer状態のHTMLコンテンツからエンコーディングを判定してUTF-8に変換
    var enc = options.encode || this.encoding.detect(body);
    if (enc) {
      enc = enc.toLowerCase();
      try {
        body = this.encoding.convert(enc, body);
      } catch (e) {
        return {
          err: e,
          extra: { charset: enc },
          result: result
        };
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
      return {
        err: 'server status',
        extra: { statusCode: res.statusCode },
        result: result
      };
    }

    if (options.referer) {
      // 次のリクエスト時に今アクセスしたURLをRefererとする
      options.headers.Referer = result.$._root._documentInfo.url;
    }

    return { result: result };
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
      encode = null;
    } else if (typeOf(param) === 'function') {
      callback = param;
      param = null;
      encode = null;
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
        time: true,
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
    var isSync = false;
    if (callback === 'sync') {
      isSync = true;
      callback = null;
    }

    var options = this.prepare(method, url, param, encode, callback);

    // デバッグ情報
    if (this.core.debug) {
      var label = '[DEBUG]';
      var debugParams = {};
      debugParams[label] = {};
      each([ 'uri', 'method', 'headers', 'qs', 'form' ], function (v) {
        if (options.param[v]) {
          debugParams[label][v] = options.param[v];
        }
      });
      var cookies = {};
      each(options.param.jar.getCookies(options.param.uri), function (c) {
        cookies[c.key] = c.value;
      });
      if (Object.keys(cookies).length > 0) {
        debugParams[label].cookies = cookies;
      }
      process.stderr.write(prettyjson.render(debugParams) + '\n\n');
    }

    // 同期処理
    if (isSync) {
      return this.executeSync(options);
    }

    // 非同期処理
    if (! (typeOf(options.callback) === 'function')) {
      // callbackを指定しなかった場合はpromiseオブジェクトを返す
      return new RSVP.Promise((function (resolve, reject) {
        this.execute(options, resolve, reject);
      }).bind(this));
    }
    this.execute(options);
  }
};

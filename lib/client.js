/* eslint node/no-deprecated-api:off */
'use strict';

var request = require('request');
var fs = require('fs');
var urlParser = require('url');
var RSVP = require('rsvp');
var each = require('foreach');
var typeOf = require('type-of');
var assign = require('object-assign');
var prettyjson = require('prettyjson');
var spawnSync = require('child_process').spawnSync;
var path = require('path');
var tools = require('./tools');
// os-localeは最初に実行した段階で結果をcacheに持つので
// fetch()前に別のモジュールがos-localeを実行していた場合に
// オプション内容によっては予期しない結果が返ることがある
var importFresh = require('import-fresh');
var osLocale = null;
try {
  osLocale = importFresh('os-locale');
} catch (e) {}

/**
 * <meta[http-equiv=refresh]>からURLを取得する正規表現
 */
var reMetaRefresh = {
  comment: /<!--[\s\S]*?-->/g,
  tag: /<\s*meta\s[\s\S]*http-equiv\s*=\s*["']?refresh["']?[\s\S]*?>/i,
  url: /\d\s*;\s*URL\s*=\s*["']?\s*(.*?)["'\s>]/i
};

/**
 * http(s)リクエスト処理メインモジュール
 */
var Client = function (instance) {
  this.instance = instance;
};

/**
 * エラーオブジェクト判定(instanceof Errorでfalseになるケースがあったため)
 *
 * @param err     Errorオブジェクトもしくはエラーメッセージ文字列
 * @return boolean エラーオブジェクトか否か
 */
Client.prototype.isErrorObject = function (err) {
  if (err instanceof Error) return true;
  if (!err.stack || !err.message) return false;
  return typeof err.stack === 'string' && typeof err.message === 'string';
};

/**
 * promise/callbackに両対応したエラー終了処理(promise実行後)
 *
 * @param err     Errorオブジェクトもしくはエラーメッセージ文字列
 * @param options prepareで作成したオプション情報
 * @param extra   Errorオブジェクトに追加する情報
 * @param result  処理結果オブジェクト
 * @param reject  (promise処理時のみ)reject関数
 */
Client.prototype.fail = function (err, options, extra, result, reject) {
  extra = extra || {};
  result = result || {};
  var error = this.isErrorObject(err) ? err : new Error(err);
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
};

/**
 * promise/callbackに両対応したエラー終了処理(promise実行前)
 *
 * @param err     Errorオブジェクトもしくはエラーメッセージ文字列
 * @param options prepareで作成したオプション情報
 * @param extra   Errorオブジェクトに追加する情報
 * @param result  処理結果オブジェクト
 * @param reject  (promise処理時のみ)reject関数
 */
Client.prototype.error = function (err, options, extra, result) {
  extra = extra || {};
  result = result || {};

  // callback形式 or 同期処理
  if (typeOf(options.callback) === 'function' || options.callback === 'sync') {
    return this.fail(err, options, extra, result);
  }

  // promise形式(promiseオブジェクトを返す)
  return new RSVP.Promise(
    function (resolve, reject) {
      return this.fail(err, options, extra, result, reject);
    }.bind(this)
  );
};

/**
 * レスポンスからリダイレクト先のURLを取得
 *
 * @param res      requestモジュールで取得したレスポンスオブジェクト
 * @param body     コンテンツのBuffer
 * @return string リダイレクト先のURL(なければnull)
 */
Client.prototype.checkRedirect = function (res, body) {
  // POST後のリダイレクトはrequestモジュールでは自動で飛んでくれない(と思う)
  if (/^30\d$/.test(res.statusCode) && res.headers.location) {
    return urlParser.resolve(res.request.uri.href, res.headers.location);
  }

  // ここから先はHTMLの場合のみ
  if (!this.instance.followMetaRefresh || !/html/.test(res.headers['content-type'])) {
    return null;
  }

  // METAタグのrefreshがHTML内にあればリダイレクト
  // IEの時だけリダイレクトとか考慮するのが面倒なのでコメントは全部削除
  var chkBody = (body || '').toString('utf-8').replace(reMetaRefresh.comment, '');
  var metaRefresh = chkBody.match(reMetaRefresh.tag);
  if (metaRefresh) {
    var refreshUrl = (metaRefresh[0].match(reMetaRefresh.url) || [])[1];
    // refreshのURLが相対パスの場合があるので絶対パス化
    return urlParser.resolve(res.request.uri.href, refreshUrl);
  }

  return null;
};

/**
 * リクエスト処理
 *
 * @param param    requestモジュールでのhttpアクセス時に指定するパラメータ
 * @param retry    内部処理用引数(リトライ回数)
 * @param callback リクエスト完了時のコールバック関数(err, response, body(buffer))
 */
Client.prototype.request = function (param, retry, callback) {
  if (typeOf(retry) === 'function') {
    callback = retry;
    retry = 0;
  }

  // レスポンスのサイズを計測するためのバッファ
  var buffer = '';
  var maxDataSize = this.instance.maxDataSize;

  // リクエスト実行
  var req = request(
    param,
    function (err, res, body) {
      if (err) {
        if (callback) {
          callback(err, res, body);
          return;
        }
        req.emit('error', err);
        return;
      }

      // requestモジュールが対応していないタイプのリダイレクトチェック
      var location = this.checkRedirect(res, body);
      if (location) {
        retry = retry || 0;
        if (retry > 5) {
          err = new Error('redirect limit over');
          if (callback) {
            callback(err, res, body);
            return;
          }
          req.emit('error', err);
          return;
        }

        // パラメータの調整
        if (!/^30\d$/.test(res.statusCode)) {
          // METAタグrefreshの場合はリファラーを更新
          param.headers.Referer = param.uri;
        }
        var parsed = urlParser.parse(location);
        param.headers.Host = parsed.host;
        param.uri = location;
        param.method = 'GET';
        delete param.formData;
        delete param.form;
        delete param.qs;
        this.request(param, retry + 1, callback);
        return;
      }

      if (callback) {
        callback(null, res, body);
      }
    }.bind(this)
  ).on('data', function (chunk) {
    if (this._aborted) return;
    if (maxDataSize != null) {
      // バッファにチャンクを追加
      buffer += chunk;

      // 制限を超過したら中止
      if (buffer.length > maxDataSize) {
        req.abort();
        callback(new Error('data size limit over'));
      }
    }
  });

  return req;
};

/**
 * リクエストオプションからクッキー連想配列を作成
 *
 * @param options prepareで作成したオプション情報
 * @return {名前: 値}のクッキー連想配列
 */
Client.prototype.getCookiesFromOption = function (options) {
  var cookies = {};
  each(options.param.jar.getCookies(options.param.uri), function (c) {
    cookies[c.key] = c.value;
  });
  return cookies;
};

/**
 * 非同期http通信処理本体
 *
 * @param options prepareで作成したオプション情報
 * @param resolve (promise処理時のみ)resolve関数
 * @param reject  (promise処理時のみ)reject関数
 */
Client.prototype.execute = function (options, resolve, reject) {
  // リクエスト実行
  this.request(
    options.param,
    function (err, res, body) {
      // レスポンスから処理結果オブジェクト作成
      var obj = this.responseToResult(err, res, body, options);
      if (obj.err) {
        this.fail(obj.err, options, obj.extra, obj.result, reject);
        return;
      }

      // promise処理時とcallback処理時で処理の返し方を切り替え
      var result = obj.result;
      if (typeOf(options.callback) === 'function') {
        options.callback(result.error, result.$, result.response, result.body);
      } else {
        resolve(result);
      }
    }.bind(this)
  );
};

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
Client.prototype.executeSync = function (options) {
  var args = {
    param: {},
    config: {},
    cookies: this.instance.exportCookies(),
    formData: {},
    uploadFiles: {}
  };

  // workerに渡すオプション取得(jarとfromDataは別管理なのでここでは渡さない)
  each(options.param, function (val, key) {
    if (['jar', 'formData'].indexOf(key) !== -1) return;
    args.param[key] = val;
  });

  // formDataはwokerで作り直す(stdinでストリームのインスタンスが渡せない)
  each(options.param.formData || {}, function (val, key) {
    if (typeOf(val) === 'array') {
      args.uploadFiles[key] = val.map(function (vv) {
        return vv.path;
      });
    } else {
      args.formData[key] = val;
    }
  });

  // workerに渡すconfigオプション取得(関数/download/versionは渡さない)
  each(this.instance, function (val, key) {
    if (typeOf(val) === 'function') return;
    if (['download', 'version'].indexOf(key) !== -1) return;
    args.config[key] = val;
  });

  // spawnSyncでworker.jsでリクエスト処理を行う
  var worker = [path.join(__dirname, 'worker.js')];
  var result = spawnSync(process.execPath, worker, {
    input: JSON.stringify(args),
    encoding: 'utf-8',
    maxBuffer: null // nullだと無制限になるっぽい(ソースなし)
  });
  var message = result.status === 0 ? result.stderr : null;

  // worker.jsが出力したJSONを取得して処理結果オブジェクトを作成
  var json = {};
  try {
    json = JSON.parse(result.stdout);
  } catch (e) {
    if (!message) {
      message = 'An error occurred during the sync request: ' + e.message;
    }
    if (tools.isWebpacked()) {
      tools.colorMessage(
        'WARNING',
        'synced http request have been disabled in this environment (eg Webpacked)'
      );
    }
  }

  // worker.jsのjarが取得したcookieを元オプションのjarにセット
  if (json.response) {
    this.instance.importCookies(json.cookies);
  }

  var err = message ? new Error(message) : null;
  var body = json.body ? tools.newBuffer(json.body) : null;
  var obj = this.responseToResult(err, json.response, body, options);
  if (obj.err) {
    return this.fail(obj.err, options, obj.extra, obj.result);
  }
  return obj.result;
};

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
Client.prototype.responseToResult = function (err, res, body, options) {
  // 処理結果格納先
  var result = {};

  // クッキー取得
  if (res) {
    res.cookies = this.getCookiesFromOption(options);
    Object.freeze(res.cookies);
    result.response = res;
  }

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
  var enc = options.encode || Client.encoding.detect(body);
  if (enc) {
    enc = enc.toLowerCase();
    try {
      body = Client.encoding.convert(enc, body);
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
  var cheerioOpt = {
    decodeEntities: true,
    xmlMode:
      !this.instance.forceHtml &&
      ((res && /[/+]xml\b/.test(res.headers['content-type'])) ||
        /\.(rss|rdf|atom|opml|xslt?)\b/.test(options.param.uri))
    // Content-Typeか拡張子でXMLであると判別された場合はxmlModeをON
  };
  result.$ = Client.cheerio.load(result.body, cheerioOpt);
  result.$._root._documentInfo = {
    url: res.request.uri.href,
    encoding: enc,
    isXml: cheerioOpt.xmlMode
  };
  Object.defineProperty(result.$._root._documentInfo, '_instance', {
    enumerable: false,
    value: this.instance
  });
  result.$.documentInfo = function () {
    return this._root._documentInfo;
  };

  // 素の$.htmlはエンティティ化してしまうので退避
  result.$.entityHtml = result.$.html;
  result.$.html = function () {
    return tools.decodeEntities(this.entityHtml.apply(this, Array.prototype.slice.call(arguments)));
  };

  // HTMLが取得できてもレスポンスステータスが20xでない場合(ソフト404など)はエラーとして処理する
  if (String(res.statusCode).substr(0, 2) !== '20') {
    return {
      err: 'server status',
      extra: { statusCode: res.statusCode },
      result: result
    };
  }

  if (this.instance.referer) {
    // 次のリクエスト時に今アクセスしたURLをRefererとする
    this.instance.set('headers', {
      referer: result.$._root._documentInfo.url
    });
  }

  return { result: result };
};

/**
 * デフォルトのリクエストヘッダに指定したヘッダが存在するかチェック
 *
 * @param header  リクエストヘッダ名
 * @return true or false
 */
Client.prototype.hasHeader = function (header) {
  header = header.toLowerCase();
  return (
    Object.keys(this.instance.headers).filter(function (h) {
      return h.toLowerCase() === header;
    }).length > 0
  );
};

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
Client.prototype.prepare = function (method, url, param, encode, callback) {
  // 省略されている引数に合わせて調整
  if (typeOf(encode) === 'function') {
    callback = encode;
    encode = null;
  } else if (typeOf(param) === 'function') {
    callback = param;
    param = null;
    encode = null;
  }
  if (!encode && typeOf(param) === 'string' && param.indexOf('=') === -1) {
    // 第3引数が文字列でパラメータの指定でもない => paramが省略されてencodeが指定されている
    encode = param;
    param = null;
  }

  var uploadFiles = {};
  if (param instanceof tools.SubmitParams) {
    // ファイルアップロード時のsubmitはPOST文字列とアップロードファイルパス情報が
    // 格納されたSubmitParamsインスタンスに包まれているのでここで展開
    uploadFiles = param.uploadFiles;
    param = param.param;
  }

  // デフォルトはChromeとして振る舞う
  if (!this.hasHeader('User-Agent')) {
    this.instance.set('browser', 'chrome');
  }

  // OSのロケールからAcceptLanguageを設定
  if (!this.hasHeader('Accept-Language')) {
    if (tools.isWebpacked()) {
      tools.colorMessage(
        'WARNING',
        'auto detection of Accept-Language has been disabled in this environment (eg Webpack)'
      );
    }
    try {
      // spawn: trueだとexecFileSyncを使うのでできればfalseにしたいが
      // windowsだとロケールを取得できる確実な環境変数がなさそう
      var locale = osLocale.sync({ spawn: process.platform === 'win32' });
      if (locale) {
        locale = locale.replace(/_/g, '-');
        // en-USだとロケール取得に失敗した可能性があるので何もしない
        if (locale !== 'en-US') {
          this.instance.set('headers', {
            'Accept-Language': locale.replace(/_/g, '-') + ',en-US'
          });
        }
      }
    } catch (e) {
      // ロケールが取得できない場合は何もしない
    }
  }

  // Acceptヘッダにそれっぽいのを付加しておく
  if (!this.hasHeader('Accept')) {
    this.instance.set('headers', {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    });
  }

  // リクエストヘッダ作成
  var parsed = urlParser.parse(url);
  var reqHeader = assign({ Host: parsed.host }, this.instance.headers);

  var options = {
    param: {
      uri: url,
      method: method,
      encoding: null, // Bufferでコンテンツを取得する
      headers: reqHeader,
      timeout: this.instance.timeout,
      gzip: this.instance.gzip,
      time: true,
      followRedirect: true,
      jar: this.instance._cookieJar,
      agentOptions: this.instance.agentOptions
    },
    encode: encode,
    callback: callback
  };

  if (Object.keys(uploadFiles).length > 0) {
    each(uploadFiles, function (val, key) {
      param[key] = val.map(function (upfile) {
        return fs.createReadStream(upfile);
      });
    });
    options.param.formData = param;
  } else if (
    (typeOf(param) === 'object' && Object.keys(param).length > 0) ||
    (param || '').length > 0
  ) {
    options.param[method === 'GET' ? 'qs' : 'form'] = param;
  }

  return options;
};

/**
 * リクエスト処理スタート
 *
 * @param method   リクエストメソッド
 * @param url      リクエスト先のURL
 * @param param    リクエストパラメータ
 * @param encode   取得先のHTMLのエンコーディング(default: 自動判定)
 * @param callback リクエスト完了時のコールバック関数(err, cheerio, response, body)
 */
Client.prototype.run = function (method, url, param, encode, callback) {
  var isSync = false;
  if (callback === 'sync') {
    // Electron上ではSync系メソッドはサポート外
    // ※process.execPathで別スクリプトを実行する性質上
    if (process.versions.electron) {
      throw new Error('sync request is not support on Electron');
    }

    isSync = true;
    callback = null;
  }

  var options = this.prepare(method, url, param, encode, callback);

  // デバッグ情報
  if (this.instance.debug) {
    var label = '[DEBUG]';
    var debugParams = {};
    debugParams[label] = {};
    each(['uri', 'method', 'headers', 'qs', 'form'], function (v) {
      if (options.param[v]) {
        debugParams[label][v] = options.param[v];
      }
    });
    var cookies = this.getCookiesFromOption(options);
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
  if (typeOf(options.callback) !== 'function') {
    // callbackを指定しなかった場合はpromiseオブジェクトを返す
    return new RSVP.Promise(
      function (resolve, reject) {
        this.execute(options, resolve, reject);
      }.bind(this)
    );
  }
  this.execute(options);
};

module.exports = Client;

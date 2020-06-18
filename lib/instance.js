'use strict';

var request = require('request');
var assign = require('object-assign');
var util = require('util');
var typeOf = require('type-of');
var tough = require('tough-cookie');
var each = require('foreach');
var tools = require('./tools.js');
var pkg = require('../package.json');
var browsers = require('./browsers.json');
var cheerioExtend = require('./cheerio-extend');
var encoding = require('./encoding');
var Client = require('./client');

/**
 * cheerio-httpcli内部からプロパティを直接更新する際の黒魔術
 */
var propertyUpdater = {
  // 内部的にプロパティを直接更新する際の照合キー
  Key: Math.random().toString(36).substr(2),

  // プロパティ更新時の値を黒魔術で包み込む
  wrap: function (value) {
    return [this.key, value];
  },

  // プロパティ更新時の値を黒魔術から取り出す
  unwrap: function (value) {
    if (value instanceof Array && value.length === 2 && value[0] === this.key) {
      return value[1];
    }

    tools.colorMessage(
      'DEPRECATED',
      'direct property update will be refused in the future. use set(key, value)'
    );
    // throw new Error(direct property update is not permitted. use set(key, value)');
    return value;
  }
};

// リクエストヘッダを作り直す
var rebuildHeaders = function (value) {
  var tmp = {};
  var nullKeys = [];
  // リクエストヘッダは小文字に統一する & 値にnullが入っているキーは削除
  each(value, function (val, key) {
    if (value[key] == null) {
      nullKeys.push(key.toLowerCase());
    }
    tmp[key.toLowerCase()] = val;
  });
  each(nullKeys, function (key) {
    delete tmp[key];
  });
  return tmp;
};

// 通常プロパティ作成(property変数内で管理)
var defineNormalProperties = function (cli) {
  var property = {
    // リクエストヘッダ
    headers: { types: ['object'], value: null },
    // タイムアウトまでの時間
    timeout: { types: ['number'], value: null },
    // gzip転送する/しない
    gzip: { types: ['boolean'], value: null },
    // Refererを自動設定する/しない
    referer: { types: ['boolean'], value: null },
    // <meta[http-equiv=refresh]>を検知してリダイレクトする/しない
    followMetaRefresh: { types: ['boolean'], value: null },
    // 受信を許可する最大のサイズ
    maxDataSize: { types: ['number', 'null'], value: null },
    // XML自動判別を使用しない
    forceHtml: { types: ['boolean'], value: null },
    // requestモジュールに渡すagentOptions
    agentOptions: { types: ['object'], value: null },
    // デバッグオプション
    debug: { types: ['boolean'], value: null }
  };

  // プロパティ登録(直接更新時にはDEPRECATEDメッセージを表示)
  Object.keys(property).forEach(function (prop) {
    Object.defineProperty(cli, prop, {
      enumerable: true,
      get: function () {
        // TODO 現在は直接更新も可としているのでコメントアウトしておく
        // if (typeOf(property[prop].value) === 'object') {
        //  // オブジェクトの場合は複製を返す
        //  var copy = {};
        //  each(property[prop].value, function (val, key) {
        //    copy[key] = val;
        //  });
        //  return copy;
        // }
        return property[prop].value;
      },
      set: function (value) {
        value = propertyUpdater.unwrap(value);

        // 型チェック
        var types = property[prop].types;
        var vtype = typeOf(value);
        if (types.indexOf(vtype) === -1 || (vtype === 'number' && value < 0)) {
          tools.colorMessage(
            'WARNING',
            'invalid value: ' +
              String(value) +
              '. ' +
              'property "' +
              prop +
              '" can accept only ' +
              types.join(' or ')
          );
          return;
        }

        // headersのキーを全部小文字に変換 & 値がnullのキーは削除
        if (prop === 'headers') {
          value = rebuildHeaders(value);
        }

        property[prop].value = value;
      }
    });
  });
};

// 特殊プロパティ作成(動的に値を用意する)
var defineSpecialProperties = function (cli) {
  // browserプロパティ
  Object.defineProperty(cli, 'browser', {
    enumerable: true,
    get: function () {
      // User-Agentとブラウザテンプレが一致するものを探す
      var ua = this.headers['user-agent'];
      if (!ua) {
        return null;
      }
      var browser = Object.keys(browsers).filter(function (name) {
        return browsers[name] === ua;
      });
      if (browser.length > 0) {
        return browser[0];
      }
      return 'custom';
    },
    set: function (type) {
      type = propertyUpdater.unwrap(type);
      var ua = type in browsers ? browsers[type] : null;

      if (type != null && ua == null) {
        tools.colorMessage('WARNING', 'unknown browser: ' + type);
      } else {
        this.set('headers', {
          'User-Agent': ua
        });
      }
    }
  });

  // iconvプロパティ
  Object.defineProperty(cli, 'iconv', {
    enumerable: true,
    get: function () {
      return Client.encoding.getIconvType();
    },
    set: function (icmod) {
      icmod = propertyUpdater.unwrap(icmod);

      if (tools.isWebpacked()) {
        tools.colorMessage(
          'WARNING',
          'changing Iconv module have been disabled in this environment (eg Webpacked)'
        );
        return;
      }

      if (!Client.encoding.iconvLoad(icmod)) {
        throw new Error('Cannot find module "' + icmod + '"');
      }
    }
  });
};

/**
 * クライアントクラス
 */
var CheerioHttpCli = function () {
  // インスタンス専用のクッキーを作成
  Object.defineProperty(this, '_cookieJar', {
    enumerable: false,
    value: request.jar()
  });
};

/**
 * GETによる非同期httpリクエストを実行
 *
 * @param url      リクエスト先のURL
 * @param param    リクエストパラメータ
 * @param encode   取得先のHTMLのエンコーディング(default: 自動判定)
 * @param callback リクエスト完了時のコールバック関数(err, cheerio, response, body)
 */
CheerioHttpCli.prototype.fetch = function (url, param, encode, callback) {
  var cli = new Client(this);
  return cli.run('GET', url, param, encode, callback);
};

/**
 * GETによる同期httpリクエストを実行
 *
 * @param url      リクエスト先のURL
 * @param param    リクエストパラメータ
 * @param encode   取得先のHTMLのエンコーディング(default: 自動判定)
 * @param callback リクエスト完了時のコールバック関数(err, cheerio, response, body)
 */
CheerioHttpCli.prototype.fetchSync = function (url, param, encode) {
  var cli = new Client(this);
  return cli.run('GET', url, param, encode, 'sync');
};

/**
 * プロパティを操作
 *
 * @param name  操作するプロパティ名
 * @param value 挿入する値
 * @param nomerge trueのときマージを行わない
 */
CheerioHttpCli.prototype.set = function (name, value, nomerge) {
  // 特殊プロパティ
  if (['browser', 'iconv'].indexOf(name) !== -1) {
    this[name] = propertyUpdater.wrap(value);
    return this;
  }

  // プロパティが存在するかチェック
  if (
    !Object.keys(this).some(
      function (prop) {
        return prop === name && typeOf(this[prop]) !== 'function';
      }.bind(this)
    )
  ) {
    throw new Error('no such property "' + name + '"');
  }

  // オブジェクトへの代入ならマージする(黒魔術使用)
  if (!nomerge && typeOf(this[name]) === 'object' && typeOf(value) === 'object') {
    this[name] = propertyUpdater.wrap(assign(this[name], value));
  } else {
    this[name] = propertyUpdater.wrap(value);
  }
  return this;
};

/**
 * [DEPRECATED] 使用するiconvモジュールを指定
 *
 * @param icmod iconvモジュール名(iconv|iconv-jp|iconv-lite)
 */
CheerioHttpCli.prototype.setIconvEngine = function (icmod) {
  tools.colorMessage(
    'DEPRECATED',
    'setIconvEngine() will be removed in the future. use set("iconv", value)'
  );
  this.set('iconv', icmod);
};

/**
 * [DEPRECATED] ブラウザごとのUser-Agentをワンタッチ設定
 *
 * @param browser ブラウザ種類(see browsers.json)
 * @return 設定できた/できなかった
 */
CheerioHttpCli.prototype.setBrowser = function (type) {
  tools.colorMessage(
    'DEPRECATED',
    'setBrowser() will be removed in the future. use set("browser", value)'
  );
  this.set('browser', type);
};

/**
 * プロパティや内部情報の初期化
 */
CheerioHttpCli.prototype.reset = function () {
  // リクエストヘッダ
  this.set('headers', {}, true);
  // タイムアウトまでの時間(効いているかどうか不明)
  this.set('timeout', 30000);
  // gzip転送する/しない
  this.set('gzip', true);
  // Refererを自動設定する/しない
  this.set('referer', true);
  // <meta[http-equiv=refresh]>を検知してリダイレクトする/しない
  this.set('followMetaRefresh', false);
  // 受信を許可する最大のサイズ
  this.set('maxDataSize', null);
  // XML自動判別を使用しない
  this.set('forceHtml', false);
  // requestモジュールに渡すagentOptions
  this.set('agentOptions', {}, true);
  // デバッグオプション
  this.set('debug', false);

  // クッキー
  this._cookieJar._jar.removeAllCookiesSync();

  return this;
};

/**
 * クッキーJSONをインスタンスに取り込む
 *
 * @param cookieJson exportで書き出したクッキーJSON
 */
CheerioHttpCli.prototype.importCookies = function (cookieJson) {
  var cookieData = {
    cookies: cookieJson.map(function (c) {
      // puppeteer形式のクッキー情報をtough-cookie形式に変換
      var converted = {
        key: c.name,
        value: c.value,
        domain: c.domain.replace(/^\./, ''),
        path: c.path,
        httpOnly: Boolean(c.httpOnly),
        hostOnly: !/^\./.test(c.domain),
        secure: Boolean(c.secure),
        extensions: ['SameSite=' + (c.sameSite || 'none').toLowerCase()],
        creation: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      };
      if (c.expires !== -1) {
        converted.expires = new Date(c.expires * 1000).toISOString();
      }
      return converted;
    })
  };
  // cookies以外は動的に補完
  each(this._cookieJar._jar.toJSON(), function (val, key) {
    if (key === 'cookies') return;
    cookieData[key] = val;
  });
  this._cookieJar._jar = tough.CookieJar.fromJSON(cookieData);
};

/**
 * インスタンスのクッキーJSONで出力する
 *
 * @return クッキーJSON
 */
CheerioHttpCli.prototype.exportCookies = function () {
  // cookiesだけ出力
  return this._cookieJar._jar.toJSON().cookies.map(function (c) {
    // tough-cookie形式のクッキー情報をpuppeteer形式に変換
    var converted = {
      name: c.key,
      value: c.value || '',
      domain: (c.hostOnly ? '' : '.') + c.domain,
      path: c.path,
      expires: c.expires ? new Date(c.expires).getTime() / 1000 : -1,
      httpOnly: Boolean(c.httpOnly),
      secure: Boolean(c.secure)
    };
    each(c.extensions || [], function (ex) {
      var m = ex.match(/^SameSite=(.*)$/);
      if (!m) return;
      if (['lax', 'strict'].indexOf(m[1]) !== -1) {
        converted.sameSite = m[1].replace(/^./, function (p) {
          return p.toUpperCase();
        });
      }
    });
    return converted;
  });
};

/**
 * 親クライアントクラス作成
 */
var MainInstance = function () {
  CheerioHttpCli.call(this);
  defineNormalProperties(this);
  defineSpecialProperties(this);

  // バージョン情報プロパティは親クライアントのみに設定
  Object.defineProperty(this, 'version', {
    enumerable: true,
    get: function () {
      return pkg.version;
    }
  });
};
util.inherits(MainInstance, CheerioHttpCli);

/**
 * 子クライアントクラス作成
 */
var ChildInstance = function () {
  CheerioHttpCli.call(this);
  defineNormalProperties(this);
  defineSpecialProperties(this);
};
util.inherits(ChildInstance, CheerioHttpCli);

// forkはメインクライアントからのみ実行可能
MainInstance.prototype.fork = function () {
  var parent = this;
  var child = new ChildInstance();
  child.reset();

  // 親クライアントの設定情報を引き継ぐ
  Object.keys(child).forEach(function (prop) {
    // browserがcustom設定の場合はそのままセットすると警告が出るのでスキップ
    // (User-Agentのセットで自動的にcustom設定となる)
    if (prop === 'browser' && parent[prop] === 'custom') return;
    child.set(prop, parent[prop]);
  });

  // 親クライアントのクッキー情報を引き継ぐ
  child.importCookies(parent.exportCookies());

  return child;
};

var mainInstance = new MainInstance();
mainInstance.reset();

// Clientクラスで参照する情報を生やしておく
Client.mainInstance = mainInstance;
Client.encoding = encoding;
Client.cheerio = cheerioExtend(Client);

module.exports = mainInstance;

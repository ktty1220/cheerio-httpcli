/*jshint -W100*/

'use strict';

var assign        = require('object-assign');
var typeOf        = require('type-of');
var each          = require('foreach');
var cheerioExtend = require('./cheerio-extend');
var util          = require('./cheerio/util.js');
var encoding      = require('./encoding');
var client        = require('./client');
var pkg           = require('../package.json');
var browsers      = require('./browsers.json');

/**
 * cheerio-httpcli内部からプロパティを直接更新する際の黒魔術
 */
var propertyUpdater = {
  // 内部的にプロパティを直接更新する際の照合キー
  Key: Math.random().toString(36).substr(2),

  // プロパティ更新時の値を黒魔術で包み込む
  wrap: function (value) {
    return [ this.key, value ];
  },

  // プロパティ更新時の値を黒魔術から取り出す
  unwrap: function (value) {
    if ((value instanceof Array) &&
      value.length === 2 && value[0] === this.key) {
      return value[1];
    }

    util.colorMessage('DEPRECATED', 'direct property update will be refused in the future. use set(key, value)');
    //throw new Error(direct property update is not permitted. use set(key, value)');
    return value;
  }
};

// リクエストヘッダを作り直す
var rebuildHeaders = function (value) {
  var tmp = {};
  var nullKeys = [];
  // リクエストヘッダは小文字に統一する & 値にnullが入っているキーは削除
  each(value, function (val, key) {
    if (value[key] === null) {
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
  /*eslint-disable key-spacing*/
  var property = {
    // リクエストヘッダ
    headers           : { types: [ 'object' ], value: null },
    // タイムアウトまでの時間
    timeout           : { types: [ 'number' ], value: null },
    // gzip転送する/しない
    gzip              : { types: [ 'boolean' ], value: null },
    // Refererを自動設定する/しない
    referer           : { types: [ 'boolean' ], value: null },
    // <meta[http-equiv=refresh]>を検知してリダイレクトする/しない
    followMetaRefresh : { types: [ 'boolean' ], value: null },
    // 受信を許可する最大のサイズ
    maxDataSize       : { types: [ 'number', 'null' ], value: null },
    // XML自動判別を使用しない
    forceHtml         : { types: [ 'boolean' ], value: null },
    // requestモジュールに渡すagentOptions
    agentOptions      : { types: [ 'object' ], value: null },
    // デバッグオプション
    debug             : { types: [ 'boolean' ], value: null }
  };
  /*eslint-enable key-spacing*/

  // プロパティ登録(直接更新時にはDEPRECATEDメッセージを表示)
  Object.keys(property).forEach(function (prop) {
    Object.defineProperty(cli, prop, {
      enumerable: true,
      get: function () {
        // TODO 現在は直接更新も可としているのでコメントアウトしておく
        //if (typeOf(property[prop].value) === 'object') {
        //  // オブジェクトの場合は複製を返す
        //  var copy = {};
        //  each(property[prop].value, function (val, key) {
        //    copy[key] = val;
        //  });
        //  return copy;
        //}
        return property[prop].value;
      },
      set: function (value) {
        value = propertyUpdater.unwrap(value);

        // 型チェック
        var types = property[prop].types;
        var vtype = typeOf(value);
        if (types.indexOf(vtype) === -1 || (vtype === 'number' && value < 0)) {
          util.colorMessage(
            'WARNING',
            'invalid value: ' + String(value) + '. '
            + 'property "' + prop + '" can accept only ' + types.join(' or ')
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
      if (! ua) {
        return null;
      }
      var browser = Object.keys(browsers).filter(function (name) {
        return (browsers[name] === ua);
      });
      if (browser.length > 0) {
        return browser[0];
      }
      return 'custom';
    },
    set: function (type) {
      type = propertyUpdater.unwrap(type);

      if (type in browsers) {
        this.set('headers', {
          'User-Agent': browsers[type]
        });
        return;
      }
      util.colorMessage('WARNING', 'unknown browser: ' + type);
    }
  });

  // iconvプロパティ
  Object.defineProperty(cli, 'iconv', {
    enumerable: true,
    get: function () {
      return encoding.getIconvType();
    },
    set: function (icmod) {
      icmod = propertyUpdater.unwrap(icmod);

      if (! encoding.iconvLoad(icmod)) {
        throw new Error('Cannot find module "' + icmod + '"');
      }
    }
  });

  // バージョン情報プロパティ
  Object.defineProperty(cli, 'version', {
    enumerable: true,
    get: function () {
      return pkg.version;
    }
  });
};

// WIP マルチインスタンス化に向けて構造変更中
var CheerioHttpCli = (function () {
  /**
   * コンストラクタ
   */
  function CheerioHttpCli() {
    defineNormalProperties(this);
    defineSpecialProperties(this);
  }

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

    client.reset();
    return this;
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
    if ([ 'browser', 'iconv' ].indexOf(name) !== -1) {
      this[name] = propertyUpdater.wrap(value);
      return this;
    }

    // プロパティが存在するかチェック
    if (! Object.keys(this).some((function (prop) {
      return (prop === name && typeOf(this[prop]) !== 'function');
    }).bind(this))) {
      throw new Error('no such property "' + name + '"');
    }

    // オブジェクトへの代入ならマージする(黒魔術使用)
    if (! nomerge && typeOf(this[name]) === 'object' && typeOf(value) === 'object') {
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
    util.colorMessage('DEPRECATED', 'setIconvEngine() will be removed in the future. use set("iconv", value)');
    this.set('iconv', icmod);
  };

  /**
   * [DEPRECATED] ブラウザごとのUser-Agentをワンタッチ設定
   *
   * @param browser ブラウザ種類(see browsers.json)
   * @return 設定できた/できなかった
   */
  CheerioHttpCli.prototype.setBrowser = function (type) {
    util.colorMessage('DEPRECATED', 'setBrowser() will be removed in the future. use set("browser", value)');
    this.set('browser', type);
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
    return client.run('GET', url, param, encode, callback);
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
    return client.run('GET', url, param, encode, 'sync');
  };

  return CheerioHttpCli;
})();

var mainClient = new CheerioHttpCli();
// clientオブジェクト内で使用する外部オブジェクトを登録
mainClient.reset();
client.core = mainClient;
client.encoding = encoding;
client.cheerio = cheerioExtend(encoding, client);

module.exports = mainClient;

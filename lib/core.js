/*jshint -W100*/

'use strict';

var assign        = require('object-assign');
var typeOf        = require('type-of');
var cheerioExtend = require('./cheerio-extend');
var util          = require('./cheerio/util.js');
var encoding      = require('./encoding');
var client        = require('./client');
var pkg           = require('../package.json');
var browsers      = require('./browsers.json');

// WIP マルチインスタンス化に向けて構造変更中
var CheerioHttpCli = (function () {
  /**
   * コンストラクタ
   */
  function CheerioHttpCli() {
    /*eslint-disable key-spacing*/
    var property = {
      headers           : {},           // リクエストヘッダ
      timeout           : 30000,        // タイムアウトまでの時間(効いているかどうか不明)
      gzip              : true,         // gzip転送する/しない
      referer           : true,         // Refererを自動設定する/しない
      followMetaRefresh : false,        // <meta[http-equiv=refresh]>を検知してリダイレクトする/しない
      maxDataSize       : null,         // 受信を許可する最大のサイズ
      forceHtml         : false,        // XML自動判別を使用しない
      debug             : false         // デバッグオプション
    };
    /*eslint-enable key-spacing*/

    var _this = this;
    Object.keys(property).forEach(function (prop) {
      Object.defineProperty(_this, prop, {
        enumerable: true,
        get: function () {
          return property[prop];
        },
        set: function (value) {
          // cheerio-httpcli内部から更新する場合の黒魔術
          if ((value instanceof Array) &&
            value.length === 3 &&
            value[0] === value[2] &&
            value[0] === true) {
            value = value[1];
          } else {
            util.depricated('direct property update will be refused in the future. use set(key, value)');
          }
          property[prop] = value;
        }
      });
    });

    // バージョン情報
    Object.defineProperty(this, 'version', {
      get: function () {
        return pkg.version;
      }
    });
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
    // デバッグオプション
    this.set('debug', false);

    client.reset();
  };

  /**
   * プロパティを操作
   *
   * @param name  操作するプロパティ名
   * @param value 挿入する値
   * @param nomerge trueのときマージを行わない
   */
  CheerioHttpCli.prototype.set = function (name, value, nomerge) {
    // プロパティが存在するかチェック
    if (! Object.keys(this).some((function (prop) {
      return (prop === name && typeOf(this[prop]) !== 'function');
    }).bind(this))) {
      throw new Error('no such property "' + name + '"');
    }

    // オブジェクトへの代入ならマージする(黒魔術使用)
    if (nomerge !== true && typeOf(this[name]) === 'object' && typeOf(value) === 'object') {
      this[name] = [ true, assign(this[name], value), true ];
    } else {
      this[name] = [ true, value, true ];
    }
  };

  /**
   * 使用するiconvモジュールを指定
   *
   * @param icmod iconvモジュール名(iconv|iconv-jp|iconv-lite)
   */
  CheerioHttpCli.prototype.setIconvEngine = function (icmod) {
    if (! encoding.iconvLoad(icmod)) {
      throw new Error('Cannot find module "' + icmod + '"');
    }
  };

  /**
   * ブラウザごとのUser-Agentをワンタッチ設定
   *
   * @param browser ブラウザ種類(see browsers.json)
   * @return 設定できた/できなかった
   */
  CheerioHttpCli.prototype.setBrowser = function (type) {
    if (type in browsers) {
      this.headers['User-Agent'] = browsers[type];
      return true;
    }
    return false;
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

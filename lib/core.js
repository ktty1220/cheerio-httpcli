/*jshint -W100*/
'use strict';

var cheerioExtend = require('./cheerio-extend');
var encoding      = require('./encoding');
var client        = require('./client');
var pkg           = require('../package.json');
var browsers      = require('./browsers.json');

/**
 * cheerio-httpcliモジュール本体
 */
var cheerioHttpCli = {
  /**
   * プロパティ
   */
  version: pkg.version, // バージョン情報

  /**
   * メソッド
   */

  /**
   * プロパティや内部情報の初期化
   */
  reset: function () {
    // リクエストヘッダ
    this.headers = {};
    // タイムアウトまでの時間(効いているかどうか不明)
    this.timeout = 30000;
    // gzip転送する/しない
    this.gzip = true;
    // Refererを自動設定する/しない
    this.referer = true;
    // <meta[http-equiv=refresh]>を検知してリダイレクトする/しない
    this.followMetaRefresh = false;
    // 受信を許可する最大のサイズ
    this.maxDataSize = null;
    // デバッグオプション
    this.debug = false;

    client.reset();
  },

  /**
   * 使用するiconvモジュールを指定
   *
   * @param icmod iconvモジュール名(iconv|iconv-jp|iconv-lite)
   */
  setIconvEngine: function (icmod) {
    if (! encoding.iconvLoad(icmod)) {
      throw new Error('Cannot find module "' + icmod + '"');
    }
  },

  /**
   * ブラウザごとのUser-Agentをワンタッチ設定
   *
   * @param browser ブラウザ種類(see browsers.json)
   * @return 設定できた/できなかった
   */
  setBrowser: function (type) {
    if (type in browsers) {
      this.headers['User-Agent'] = browsers[type];
      return true;
    }
    return false;
  },

  /**
   * GETによる非同期httpリクエストを実行
   *
   * @param url      リクエスト先のURL
   * @param param    リクエストパラメータ
   * @param encode   取得先のHTMLのエンコーディング(default: 自動判定)
   * @param callback リクエスト完了時のコールバック関数(err, cheerio, response, body)
   */
  fetch: function (url, param, encode, callback) {
    return client.run('GET', url, param, encode, callback);
  },

  /**
   * GETによる同期httpリクエストを実行
   *
   * @param url      リクエスト先のURL
   * @param param    リクエストパラメータ
   * @param encode   取得先のHTMLのエンコーディング(default: 自動判定)
   * @param callback リクエスト完了時のコールバック関数(err, cheerio, response, body)
   */
  fetchSync: function (url, param, encode) {
    return client.run('GET', url, param, encode, 'sync');
  }
};

// clientオブジェクト内で使用する外部オブジェクトを登録
cheerioHttpCli.reset();
client.core = cheerioHttpCli;
client.encoding = encoding;
client.cheerio = cheerioExtend(encoding, client);

module.exports = cheerioHttpCli;

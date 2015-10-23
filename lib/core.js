/*eslint key-spacing:0*/
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

  version : pkg.version, // バージョン情報
  headers : {},          // リクエストヘッダ
  timeout : 30000,       // タイムアウトまでの時間(効いているかどうか不明)
  gzip    : true,        // gzip転送する/しない
  referer : true,        // Refererを自動設定する/しない
  debug   : false,       // デバッグオプション

  /**
   * メソッド
   */

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
   * GETによるhttpリクエストを実行
   *
   * @param url      リクエスト先のURL
   * @param param    リクエストパラメータ
   * @param encode   取得先のHTMLのエンコーディング(default: 自動判定)
   * @param callback リクエスト完了時のコールバック関数(err, cheerio, response, body)
   */
  fetch: function (url, param, encode, callback) {
    return client.run('GET', url, param, encode, callback);
  }
};

// clientオブジェクト内で使用する外部オブジェクトを登録
client.core = cheerioHttpCli;
client.encoding = encoding;
client.cheerio = cheerioExtend(encoding, client);

module.exports = cheerioHttpCli;

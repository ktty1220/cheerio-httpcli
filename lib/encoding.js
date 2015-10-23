/*eslint key-spacing:0, no-unused-expressions:0*/
/*global EscapeSJIS, EscapeEUCJP, EscapeJIS7 */
'use strict';

var jschardet = require('jschardet');
require('./vendor/ecl_new');

/**
 * <head>タグ内からエンコーディングを判定する正規表現
 */
var reEnc = {
  head    : /<head[\s>]([\s\S]*?)<\/head>/i,
  charset : /<meta[^>]*[\s;]+charset\s*=\s*["']?([\w\-_]+)["']?/i
};

/**
 * iconvモジュール情報
 */
var iconvMod = {
  engine : null,
  func   : null,
  cache  : {}
};

/**
 * encodingモジュール本体
 */
var encoding = {
  /**
   * メソッド
   */

  /**
   * iconvモジュールをロード
   *
   * @param module iconvモジュール名(iconv|iconv-jp|iconv-lite)
   * @return ロードできた/できなかった
   */
  iconvLoad: function (module) {
    // モジュール名チェック
    if (! /^iconv(-(jp|lite))?$/.test(module)) {
      return false;
    }

    // モジュールをロード
    try {
      iconvMod.engine = require(module);
    } catch (e) {
      return false;
    }

    if (iconvMod.engine.Iconv) {
      // iconv/iconv-jpはIconvというメソッドを持っている
      iconvMod.func = function (enc, buffer) {
        if (! (enc in iconvMod.cache)) {
          // Iconvオブジェクトをキャッシュする
          iconvMod.cache[enc] = new iconvMod.engine.Iconv(enc, 'UTF-8//TRANSLIT//IGNORE');
        }
        return iconvMod.cache[enc].convert(buffer);
      };
    } else {
      // iconv-lite用
      iconvMod.func = function (enc, buffer) {
        if (! iconvMod.engine.encodingExists(enc)) {
          // iconv/iconv-jpとエラーオブジェクトの形を合わせる
          var err = new Error('EINVAL, Conversion not supported.');
          err.errno = 22;
          err.code = 'EINVAL';
          throw err;
        }
        return iconvMod.engine.decode(buffer, enc);
      };
    }
    return true;
  },

  /**
   * HTML(Buffer)のエンコーディングをUTF-8に変換
   *
   * @param enc    変換元のエンコーディング
   * @param buffer HTML(Buffer)
   * @return UTF-8に変換後のHTML(Buffer)
   */
  convert: function (enc, buffer) {
    if (/^utf\-?8$/i.test(enc)) {
      return buffer;
    }
    if (/(shift_jis|sjis)/i.test(enc)) {
      // Shift_JISを指定してIconvで変換すると半角チルダが波ダッシュ(0x301C)に変換されてしまうのでCP932に変更
      enc = 'CP932';
    }
    return iconvMod.func(enc, buffer);
  },

  /**
   * パラメータのURL%エンコード(各種エンコーディング対応)
   *
   * @param enc 変換先のエンコーディング
   * @param str URLエンコードする文字列
   * @return encで指定したエンコーディングでURL%エンコードした文字列
   */
  escape: function (enc, str) {
    var encodeFunc = null;
    // とりあえず大部分を占めそうなものだけ対応
    switch (enc) {
      case 'shift_jis': {
        encodeFunc = EscapeSJIS;
        break;
      }
      case 'euc-jp': {
        encodeFunc = EscapeEUCJP;
        break;
      }
      case 'iso-2022-jp': {
        encodeFunc = EscapeJIS7;
        break;
      }
      default: {
        encodeFunc = encodeURIComponent;
      }
    }
    return encodeFunc(str);
  },

  /**
   * jschardetモジュールによるHTMLのエンコーディング判定
   *
   * @param buffer HTML(Buffer)
   * @return 判定できた場合はエンコーディング名
   */
  detectByBuffer: function (buffer) {
    var enc = jschardet.detect(buffer);
    // 高精度で判定できた場合のみ
    if (enc && enc.encoding && (enc.confidence || 0) >= 0.99) {
      return enc.encoding;
    }
    return null;
  },

  /**
   * <head>タグ内から正規表現でエンコーディング判定
   *
   * @param buffer HTML(Buffer)
   * @return 判定できた場合はエンコーディング名
   */
  detectByHeader: function (buffer) {
    var head = buffer.toString('ascii').match(reEnc.head);
    if (head) {
      var charset = head[1].match(reEnc.charset);
      if (charset) {
        return charset[1].trim();
      }
    }
    return null;
  },

  /**
   * HTMLエンコーディング判定(自動判定 -> <head>タグ判定の順)
   *
   * @param buffer HTML(Buffer)
   * @return 判定できた場合はエンコーディング名
   */
  detect: function (buffer) {
    return this.detectByBuffer(buffer) || this.detectByHeader(buffer);
  }
};

// 初期状態では iconv > iconv-lite の優先順でロードしておく
encoding.iconvLoad('iconv') || encoding.iconvLoad('iconv-lite');

module.exports = encoding;

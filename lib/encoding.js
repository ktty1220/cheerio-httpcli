'use strict';

var jschardet = require('jschardet');
var tools = require('./tools');
var iconvLite = require('iconv-lite');

/**
 * <head>タグ内からエンコーディングを判定する正規表現
 */
var reEnc = {
  head: /<head[\s>]([\s\S]*?)<\/head>/i,
  charset: /<meta[^>]*[\s;]+charset\s*=\s*["']?([\w\-_]+)["']?/i
};

/**
 * iconvモジュール情報
 */
var iconvMod = {
  name: null,
  engine: null,
  func: null,
  cache: {}
};

/**
 * encodingモジュール本体
 */
var encoding = {
  /**
   * iconvモジュールをロード
   *
   * @param module iconvモジュール名(iconv|iconv-jp|iconv-lite)
   * @return ロードできた/できなかった
   */
  iconvLoad: function (module) {
    // モジュール名チェック
    if (!/^iconv(-(jp|lite))?$/.test(module)) {
      return false;
    }

    // モジュールをロード
    try {
      iconvMod.engine = module === 'iconv-lite' ? iconvLite : require(module);
    } catch (e) {
      return false;
    }

    if (iconvMod.engine.Iconv) {
      // iconv/iconv-jpはIconvというメソッドを持っている
      iconvMod.func = function (enc, buffer, revert) {
        enc = enc.toUpperCase();
        var from = enc;
        var to = 'UTF-8';
        if (revert) {
          from = 'UTF-8';
          to = enc;
        }
        var cacheKey = from + ':' + to;
        if (!(cacheKey in iconvMod.cache)) {
          // Iconvオブジェクトをキャッシュする
          iconvMod.cache[cacheKey] = new iconvMod.engine.Iconv(from, to + '//TRANSLIT//IGNORE');
        }
        return iconvMod.cache[cacheKey].convert(buffer);
      };
    } else {
      // iconv-lite用
      iconvMod.func = function (enc, buffer, revert) {
        if (!iconvMod.engine.encodingExists(enc)) {
          // iconv/iconv-jpとエラーオブジェクトの形を合わせる
          var err = new Error('EINVAL, Conversion not supported.');
          err.errno = 22;
          err.code = 'EINVAL';
          throw err;
        }
        return iconvMod.engine[revert ? 'encode' : 'decode'](buffer, enc);
      };
    }
    iconvMod.name = module;
    return true;
  },

  /**
   * 使用中のiconvモジュールの種類を取得
   *
   * @return iconvモジュール名(iconv|iconv-jp|iconv-lite)
   */
  getIconvType: function () {
    return iconvMod.name;
  },

  /**
   * エンコーディング名指定がUTF-8かどうか
   *
   * @param enc エンコーディング指定名('utf-8', 'shift_jis', ...)
   * @return true or false
   */
  isUTF8: function (enc) {
    return /^utf-?8$/i.test(enc);
  },

  /**
   * HTML(Buffer)のエンコーディングをUTF-8に変換
   *
   * @param enc    変換元のエンコーディング
   * @param buffer HTML(Buffer)
   * @param revert encからUTF-8に変換ではなくUTF-8からencに変換する
   * @return UTF-8に変換後のHTML(Buffer)
   */
  convert: function (enc, buffer, revert) {
    if (this.isUTF8(enc)) {
      return buffer;
    }
    if (/(shift_jis|sjis)/i.test(enc)) {
      // Shift_JISを指定してIconvで変換すると半角チルダが波ダッシュ(0x301C)に変換されてしまうのでCP932に変更
      enc = 'CP932';
    }
    return iconvMod.func(enc, buffer, revert);
  },

  /**
   * パラメータのURL%エンコード(各種エンコーディング対応)
   *
   * @param enc 変換先のエンコーディング
   * @param str URLエンコードする文字列
   * @return encで指定したエンコーディングでURL%エンコードした文字列
   */
  escape: function (enc, str) {
    // var re = /^[\w\.\(\)\-!~*']+$/;  // encodeURIComponent互換
    var re = /^[\w~.-]+$/; // RFC-3986準拠
    str = String(str);
    if (re.test(str)) {
      // エンコード不要
      return str;
    }

    // UTF-8から指定したエンコーディングに変換したバッファを回してエスケープ文字列作成
    var buffer = tools.newBuffer(str);
    if (!this.isUTF8(enc)) {
      buffer = iconvMod.func(enc, buffer, true);
    }
    return Array.prototype.slice
      .call(buffer)
      .map(function (b) {
        if (b < 128) {
          var c = String.fromCharCode(b);
          if (re.test(c)) {
            return c;
          }
        }
        return '%' + ('0' + b.toString(16).toUpperCase()).substr(-2);
      })
      .join('');
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

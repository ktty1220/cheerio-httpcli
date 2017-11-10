/*jshint -W100*/

'use strict';

var he     = require('he');
var typeOf = require('type-of');
var colors = require('colors/safe');

/**
 * 汎用関数 - エンティティのデコード
 *
 * @param str エンティティ化された文字列
 */
module.exports.decodeEntities = function (str) {
  // 文字列でない場合(cheerioオブジェクトなど)はそのまま返す
  if (typeOf(str) !== 'string') {
    return str;
  }
  return he.decode(str);
};

/**
 * 汎用関数 - パラメータの正規化
 *
 * @param val GET/POSTパラメータ
 */
module.exports.paramFilter = function (val) {
  // 0はパラメータとして有効なので残す
  // null/undefinedは空文字にして返す
  if (typeOf(val) !== 'number' && ! val) {
    val = '';
  }
  return val;
};

/**
 * 汎用関数 - cheerio拡張情報_documentInfo取得
 *
 * @param $ 拡張cheerioオブジェクト
 * @return client.jsでWEBページ情報取得時にセットされた_documentInfo
 */
module.exports.documentInfo = function ($) {
  if ($.cheerio !== '[cheerio object]') {
    throw new Error('argument is not cheerio object');
  }
  // 大元の_rootは_originalRootという名称で保持されているらしい by cheerio/lib/static.js
  return $._root[0]._documentInfo || $._originalRoot._documentInfo;
};

/**
 * 汎用関数 - PHPでいうin_array()
 * cheerioとは無関係
 *
 * @param array 調べる配列
 * @param val   調べる値
 * @return true or false
 */
module.exports.inArray = function (array, val) {
  if (typeOf(array) !== 'array') {
    throw new Error(array + ' is not Array');
  }
  return (array.indexOf(val) !== -1);
};

/**
 * 汎用関数 - 色付きメッセージ表示
 * cheerioとは無関係
 *
 * @param type メッセージの種類
 * @param msg 表示するメッセージ
 */
module.exports.colorMessage = function (type, msg) {
  /*eslint-disable key-spacing*/
  var colorConf = {
    DEPRECATED : 'yellow',
    WARNING    : 'magenta'
  };
  /*eslint-enable key-spacing*/

  // スタックトレースを取得
  var stackTrace = null;
  try {
    throw new Error('dummy');
  } catch (e) {
    stackTrace = e.stack.split(/[\r\n]+/).filter(function (v, v2, v3) {
      return /^\s*at\s+.*:[\d]+:[\d]+/.test(v);
    }).map(function (v) {
      return v.trim();
    });
  }

  // メッセージのトリガーとなった箇所を取得
  var at = '';
  for (var i = 0; i < stackTrace.length; i++) {
    var trace = stackTrace[i];
    if (! /^at/.test(trace)) continue;
    if (/[\\\/]cheerio-httpcli[\\\/]lib[\\\/]/.test(trace)) continue;
    at = trace;
    break;
  }

  console.warn(colors[colorConf[type] || 'white'](
    '[' + type + '] ' + msg + ' ' + at
  ));
};

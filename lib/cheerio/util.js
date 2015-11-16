/*eslint no-invalid-this:0*/
'use strict';

var ent = require('ent');

/**
 * 汎用関数 - エンティティのデコード
 *
 * @param str エンティティ化された文字列
 */
module.exports.decodeEntities = function (str) {
  // 文字列でない場合(cheerioオブジェクトなど)はそのまま返す
  if (typeof str !== 'string') {
    return str;
  }
  return ent.decode(str);
};

/**
 * 汎用関数 - パラメータの正規化
 *
 * @param val GET/POSTパラメータ
 */
module.exports.paramFilter = function (val) {
  // 0はパラメータとして有効なので残す
  // null/undefinedは空文字にして返す
  if (typeof val !== 'number' && ! val) {
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

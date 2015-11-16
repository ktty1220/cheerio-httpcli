/*eslint no-invalid-this:0, no-console:0*/
'use strict';

var util   = require('util');
var colors = require('colors/safe');
var cutil  = require('./util');

module.exports = function (encoding, client, cheerio) {
  /**
   * cheerioデフォルトのtext(), html()メソッドはエンティティ表記をそのまま返すので
   * 上記メソッドを拡張してエンティティもデコードした状態で返すようにする
   *
   * @param str 指定した場合はその文字列を要素のテキスト(HTML)として設定
   *            指定しない場合は要素に設定されているテキスト(HTML)を返す
   */
  // cheerioデフォルトのメソッドを'_'付きで退避
  cheerio.prototype.rawText = cheerio.prototype.text;
  cheerio.prototype.rawHtml = cheerio.prototype.html;

  cheerio.prototype.text = function (str) {
    // cheerioデフォルトのtext()結果をデコード(エンティティ可読文字化)したものを返す
    return cutil.decodeEntities(this.rawText(str));
  };

  cheerio.prototype.html = function (str) {
    // cheerioデフォルトのhtml()結果をデコード(エンティティ可読文字化)したものを返す
    return cutil.decodeEntities(this.rawHtml(str));
  };


  /***
   * [DEPRICATED] 0.5.0で削除予定
   */
  var depricatedMessage = '[DEPRICATED] %s() will be removed on v0.5.0. use %s()';
  cheerio.prototype._text = function (str) {
    console.warn(colors.yellow(util.format(depricatedMessage, '_text', 'rawText')));
    return this.rawText(str);
  };

  cheerio.prototype._html = function (str) {
    console.warn(colors.yellow(util.format(depricatedMessage, '_html', 'rawHtml')));
    return this.rawHtml(str);
  };
};

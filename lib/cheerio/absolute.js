/*eslint no-invalid-this:0, no-undefined:0*/
'use strict';

var urlParser = require('url');
var valUrl    = require('valid-url');
var cutil     = require('./util');
var assign    = require('object-assign');

module.exports = function (encoding, client, cheerio) {
  /**
   * a要素/img要素の絶対URLを取得
   *
   * @param optFilter 取得するURLのフィルタリングオプション
   * @return 絶対URLもしくはその配列
   */
  cheerio.prototype.absoluteUrl = function (optFilter) {
    var doc = cutil.documentInfo(this);
    var $ = cheerio;
    var result = [];
    var filter = assign({
      relative: true,  // 相対リンク
      absolute: true,  // 絶対リンク
      invalid: true    // URL以外
    }, optFilter);

    // a要素/img要素でなければエラー
    this.each(function () {
      var $elem = $(this);
      var is = {
        a: $elem.is('a'),
        img: $elem.is('img')
      };
      if (! is.a && ! is.img) {
        throw new Error('element is not link or img');
      }

      // URLを取り出して絶対化
      var srcUrl = $elem.attr((is.a) ? 'href' : 'src');
      var absUrl = (srcUrl) ? urlParser.resolve(doc.url, srcUrl) : srcUrl;

      // 除外判定
      if (valUrl.isWebUri(absUrl)) {
        var isAbsoluteLink = /^[a-z]+:\/\//i.test(srcUrl);
        if (isAbsoluteLink && ! filter.absolute) {
          return;
        }
        if (! isAbsoluteLink && ! filter.relative) {
          return;
        }
      } else if (! filter.invalid) {
        return;
      }
      result.push(absUrl);
    });

    // 要素数が1の場合は配列でなく文字列で返す
    return (this.length === 1) ? result[0] : result;
  };
};

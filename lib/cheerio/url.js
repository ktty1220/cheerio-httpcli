/*eslint no-invalid-this:0*/
/*jshint -W100*/

'use strict';

var urlParser = require('url');
var valUrl    = require('valid-url');
var typeOf    = require('type-of');
var cutil     = require('./util');
var assign    = require('object-assign');

module.exports = function (encoding, client, cheerio) {
  /**
   * a要素/img要素/script要素/link要素の絶対URLを取得
   *
   * @param optFilter 取得するURLのフィルタリングオプション
   * @param srcAttrs  (imgのみ)srcよりも優先して取得する属性名(文字列 or 配列)
   * @return 絶対URLもしくはその配列
   */
  cheerio.prototype.url = function (optFilter, srcAttrs) {
    var doc = cutil.documentInfo(this);
    var $ = cheerio;
    var result = [];

    if (cutil.inArray([ 'string', 'array' ], typeOf(optFilter))) {
      srcAttrs = optFilter;
      optFilter = {};
    } else {
      optFilter = optFilter || {};
    }

    var filter = assign({
      relative: true,  // 相対リンク
      absolute: true,  // 絶対リンク
      invalid: true    // URL以外
    }, optFilter);

    srcAttrs = srcAttrs || [ 'data-original', 'data-lazy-src', 'data-src' ];
    if (typeOf(srcAttrs) !== 'array') {
      srcAttrs = [ srcAttrs ];
    }
    srcAttrs.push('src');

    // a要素/img要素/script要素でなければエラー
    this.each(function () {
      var $elem = $(this);
      var is = {
        a: $elem.is('a'),
        img: $elem.is('img'),
        script: $elem.is('script'),
        link: $elem.is('link')
      };
      if (! is.a && ! is.img && ! is.script && ! is.link) {
        throw new Error('element is not link, img, script or link');
      }

      // URLを取り出して絶対化
      var srcUrl = null;
      if (is.a || is.link) {
        srcUrl = $elem.attr('href');
      } else if (is.script) {
        srcUrl = $elem.attr('src');
      } else {
        // imgの場合はsrcAttrsの優先順に従って属性を見ていく
        for (var i = 0; i < srcAttrs.length; i++) {
          srcUrl = $elem.attr(srcAttrs[i]);
          if (srcUrl) {
            break;
          }
        }
      }

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

/*jshint node:true, forin:false */
'use strict';

var request = require('request'),
cheerio = require('cheerio');
try {
  // use iconv-jp module if installed
  var iconv = require('iconv-jp');
} catch (e) {
  var iconv = require('iconv');
}

// iconv objects
var _iconv = {};

// regexp for guess html charset
var reHead = new RegExp('<head[\\s>]([\\s\\S]*?)<\\/head>', 'i');
var reCharset = new RegExp('<meta[^>]*[\\s;]+charset\\s*=\\s*["\']?([\\w\\-_]+)["\']?', 'i');

/**
 * detect html-encoding (find 'charset=...' in <head>)
 * @param html html
 * @return encoding-charset or undefined
 */
function _detectEncoding (html) {
  var head = html.match(reHead);
  if (head) {
    var charset = head[1].match(reCharset);
    if (charset) {
      return charset[1].trim();
    }
  }
  return undefined;
}

/**
 * create error object
 * @param msg Error Object or string message
 * @param errInfo additionnal error info
 * @return Error Object
 */
function _fetchError(msg, errInfo) {
  var err = (msg instanceof Error) ? msg : new Error(msg);
  for (var ei in errInfo) {
    err[ei] = errInfo[ei];
  }
  return err;
}

/**
 * module core
 */
module.exports = {
  // default request headers
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)'
  },

  // default timeout
  timeout: 30000,

  /**
   * fetch html, and convert html-encoding to utf8, and parse html using cheerio
   * @param url request-url
   * @param param request-parameter
   * @param encode request-html-encoding (default: auto guess)
   * @param callback (err, parsed html-contents)
   */
  fetch: function (url, param, encode, callback) {
    // check parameters
    if (encode instanceof Function) {
      callback = encode;
      encode = undefined;
    } else if (param instanceof Function) {
      callback = param;
      param = undefined;
      encode = undefined;
    }

    // convert html-encoding
    request({
      uri: url,
      encoding: null,
      headers: this.headers,
      timeout: this.timeout,
      qs: param
    }, function (err, res, body) {
      if (err) {
        return callback(_fetchError(err, { url: url }));
      }
      if (res.statusCode !== 200) {
        return callback(_fetchError('server status', { statusCode: res.statusCode, url: url }));
      }
      if (!body) {
        return callback(_fetchError('body is undefined', { statusCode: res.statusCode, url: url }));
      }

      // convert html-encoding
      var enc = encode || _detectEncoding(body.toString('ascii'));
      if (enc && !/^utf\-?8$/i.test(enc)) {
        try {
          if (!_iconv[enc]) {
            // cache iconv object
            _iconv[enc] = new iconv.Iconv(enc, 'UTF-8//TRANSLIT//IGNORE');
          }
          body = _iconv[enc].convert(body);
        } catch (e) {
          return callback(_fetchError(e, { charset: enc, url: url }));
        }
      }
      body = body.toString('utf8');

      return callback(err, cheerio.load(body));
    });
  }
};

/*jshint node:true, forin:false */
'use strict';

var request = require('request').defaults({jar: true}),
urlParser = require('url'),
zlib = require('zlib'),
jschardet = require('jschardet'),
cheerio = require('cheerio');

// iconv objects
var iconvEngine = null,
iconvFunc = null,
iconvCache = {};

/**
 * load iconv module and set convert function
 * @param module iconv module name
 * @return true or false
 */
function iconvLoad(module) {
  if (! /iconv(-(jp|lite))?/.test(module)) {
    return false;
  }
  try {
    iconvEngine = require(module);
  } catch (e) {
    return false;
  }
  if (iconvEngine.Iconv) {
    iconvFunc = function (enc, buffer) {
      if (!iconvCache[enc]) {
        // cache iconv object
        iconvCache[enc] = new iconvEngine.Iconv(enc, 'UTF-8//TRANSLIT//IGNORE');
      }
      return iconvCache[enc].convert(buffer);
    };
  } else {
    iconvFunc = function (enc, buffer) {
      if (! iconvEngine.encodingExists(enc)) {
        var err = new Error('EINVAL, Conversion not supported.');
        err.errno = 22;
        err.code = 'EINVAL';
        throw err;
      }
      return iconvEngine.decode(buffer, enc);
    };
  }
  return true;
}

// iconv-jp > iconv > iconv-lite
iconvLoad('iconv-jp') || iconvLoad('iconv') || iconvLoad('iconv-lite');

/**
 * detect html-encoding (use jschardet)
 * @param buffer body(buffer)
 * @return encoding-charset or undefined
 */
function _detectEncodingByBuffer(buffer) {
  var enc = jschardet.detect(buffer);
  if (enc && enc.encoding && (enc.confidence || 0) >= 0.99) {
    return enc.encoding;
  }
  return undefined;
}

// regexp for guess html charset
var reHead = new RegExp('<head[\\s>]([\\s\\S]*?)<\\/head>', 'i');
var reCharset = new RegExp('<meta[^>]*[\\s;]+charset\\s*=\\s*["\']?([\\w\\-_]+)["\']?', 'i');

/**
 * detect html-encoding (find 'charset=...' in <head>)
 * @param html html
 * @return encoding-charset or undefined
 */
function _detectEncodingByHeader(html) {
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
 * request with gzip-transfer
 * @param param request parameter for request method
 * @param gzip true: use gzip-transfer
 * @param callback (err, response, body(buffer))
 */
function _requestEx(param, gzip, callback) {
  if (gzip) {
    // add gzip-header
    param.headers['Accept-Encoding'] = 'gzip, deflate';
  }

  // do request
  request(param, function (err, res, body) {
    if (err) {
      return callback(err, res, body);
    }

    // find gzip-encoding in response header
    var gzipped = false;
    for (var h in res.headers) {
      if (h.toLowerCase() === 'content-encoding' && res.headers[h].toLowerCase() === 'gzip') {
        gzipped = true;
        break;
      }
    }

    if (gzipped) {
      // unzip response body
      zlib.unzip(body, function (err, buf) {
        callback(err, res, buf);
      });
    } else {
      // do nothing
      callback(undefined, res, body);
    }
  });
}

/**
 * module core
 */
module.exports = {
  // default request headers
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko'
  },

  // default timeout
  timeout: 30000,

  // use gzip-transfer
  gzip: true,

  /**
   * set iconv module engine manually
   * @param module iconv module name
   */
  setIconvEngine: function (icmod) {
    if (! iconvLoad(icmod)) {
      throw new Error("Cannot find module '" + icmod + "'");
    }
  },

  /**
   * fetch html, and convert html-encoding to utf8, and parse html using cheerio
   * @param url request-url
   * @param param request-parameter
   * @param encode request-html-encoding (default: auto guess)
   * @param callback (err, parsed html-contents, response)
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

    // do request
    var parsed = urlParser.parse(url);
    var reqHeader = { Host: parsed.host };
    for (var h in this.headers) {
      reqHeader[h] = this.headers[h];
    }
    _requestEx({
      uri: url,
      encoding: null, // stop auto-encoding
      headers: reqHeader,
      timeout: this.timeout,
      qs: param
    }, this.gzip, function (err, res, body) {
      if (err) {
        return callback(_fetchError(err, {
          url: url,
          param: param
        }), undefined, res);
      }
      if (!body) {
        return callback(_fetchError('body is undefined', {
          statusCode: res.statusCode,
          url: url,
          param: param
        }), undefined, res);
      }

      // convert html-encoding
      var enc = encode ||
        _detectEncodingByBuffer(body) ||
        _detectEncodingByHeader(body.toString('ascii'));
      if (enc && !/^utf\-?8$/i.test(enc)) {
        enc = enc.toLowerCase();
        try {
          body = iconvFunc(enc, body);
        } catch (e) {
          return callback(_fetchError(e, {
            charset: enc,
            url: url,
            param: param
          }), undefined, res);
        }
      }
      body = body.toString('utf8');

      // check http status code
      var errInfo = undefined;
      if (res.statusCode !== 200) {
        errInfo = _fetchError('server status', {
          statusCode: res.statusCode,
          url: url,
          param: param
        });
      }

      return callback(errInfo, cheerio.load(body), res);
    });
  }
};

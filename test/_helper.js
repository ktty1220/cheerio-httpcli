/*eslint max-statements:[1, 100]*/
/*jshint -W100*/
var nstatic = require('node-static');
var http    = require('http');
var https   = require('https');
var path    = require('path');
var strip   = require('strip-ansi');
var each    = require('foreach');
var random  = require('random-string');
var fs      = require('fs');
var qs      = require('querystring');
var EventEmitter = require('events').EventEmitter;

/**
 * テスト用のヘルパーモジュール本体
 */
module.exports = {
  /**
   * プロパティ
   */

  // テストサーバー設定
  httpPort: 55551,
  httpsPort: 55552,
  root: path.join(__dirname, 'fixtures'),
  ready: {
    http: false,
    https: false
  },
  emitter: new EventEmitter(),

  /**
   * メソッド
   */

  /**
   * テストHTMLページのURLを作成
   */
  url: function (dir, file) {
    if (dir === '%https%') {
      return 'https://localhost:' + this.httpsPort + '/';
    }
    if (! file) {
      file = dir;
      dir = '';
    } else {
      dir += '/';
      file += '.html';
    }
    return 'http://localhost:' + this.httpPort + '/' + dir + file;
  },

  /**
   * URLパラメータの連想配列化(querystring.parseだとUTF-8しか対応していない)
   */
  qsparse: function (qs) {
    var q = {};
    each(qs.split(/&/), function (ps) {
      var p = ps.split(/=/);
      q[p[0]] = q[p[0]] || [];
      q[p[0]].push(p[1]);
    });
    each(q, function (val, name) {
      if (val.length === 1) {
        q[name] = q[name][0];
      }
    });
    return q;
  },

  /**
   * テストサーバー稼働
   */
  server: function () {
    var _this = this;
    var _traceRoute = null;
    var file = new nstatic.Server(this.root, {
      gzip: true,
      cache: 0
    });

    var defaultHeaders = function () {
      return [
        [ 'content-type', 'text/html' ]
      ];
    };

    // 特殊な結果を返すURLルーティング
    var router = {
      /*** ソフト404ページ ***/
      404: function (req, res, pdata) {
        return file.serveFile('/error/404.html', 404, {}, req, res);
      },

      /*** アクセス情報 ***/
      info: function (req, res, pdata) {
        var headers = defaultHeaders();
        // アクセス元のヘッダ情報などをレスポンスヘッダにセットして返す
        each([
          [ 'request-url', req.url ],
          [ 'request-method', req.method.toUpperCase() ],
          [ 'Set-Cookie', 'session_id=hahahaha' ],
          [ 'Set-Cookie', 'login=1' ]
        ], function (h) {
          headers.push(h);
        });
        var props = [ 'user-agent', 'referer', 'accept-language' ];
        for (var i = 0; i < props.length; i++) {
          var p = props[i];
          if (req.headers[p]) {
            headers.push([ p, req.headers[p] ]);
          }
        }
        if (pdata.length > 0) {
          headers.push([ 'post-data', pdata ]);
        }
        res.writeHead(200, headers);
        return res.end('<html></html>');
      },

      /*** セッションID保持 ***/
      session: function (req, res, pdata) {
        var headers = defaultHeaders();
        var setCookie = (/x_session_id=/.test(req.headers.cookie || ''))
          ? req.headers.cookie
          : ('x_session_id=user_' + random({ length: 32 }));
        headers.push([ 'Set-Cookie', setCookie ]);
        res.writeHead(200, headers);
        return res.end('<html></html>');
      },

      /*** リダイレクト ***/
      redirect: function (req, res, pdata) {
        var headers = defaultHeaders();
        var loc = _this.url('manual', 'euc-jp');
        if (/_relative/.test(req.url)) {
          // 相対パスバージョン
          loc = loc.replace(/^http:\/\/localhost:\d+\//, '');
        }
        headers.push([ 'location', loc ]);
        // ログインフォームから来た場合はログイン情報も
        if (pdata.length > 0) {
          var pq = qs.parse(pdata);
          headers.push([ 'Set-Cookie', 'user=' + pq.user ]);
        }
        res.writeHead(301, headers);
        return res.end('location: ' + loc);
      },

      /*** レスポンスに5秒かかるページ ***/
      slow: function (req, res, pdata) {
        var headers = defaultHeaders();
        return setTimeout(function () {
          res.writeHead(200, headers);
          res.end('<html></html>');
        }, 5000);
      },

      /*** 巨大サイズ ***/
      mega: function (req, res, pdata) {
        res.writeHead(200);
        var buf = new Array(1024 * 1024).join().split(',').map(function (v, i, a) {
          return 'a';
        }).join('');
        return res.end(buf);
      },

      /*** XML ***/
      xml: function (req, res, pdata) {
        var headers = defaultHeaders();
        var opt = {
          ext: (req.url.match(/\.(\w+)$/) || [])[1] || 'xml'
        };
        if (opt.ext === 'xml') {
          headers = [
            [ 'content-type', 'application/xml' ]
          ];
        }
        res.writeHead(200, headers);
        return res.end(fs.readFileSync(path.join(this.root, 'xml/rss.xml')));
      }
    };

    this.emitter.on('start', (function (protocol) {
      this.ready[protocol] = true;
      if (Object.keys(this.ready).every((function (srv) {
        return this.ready[srv];
      }).bind(this))) {
        process.stderr.write('%%% server ready %%%\n');
      }
    }).bind(this));

    http.createServer(function (req, res) {
      var pdata = '';
      req.on('data', function (data) {
        pdata += data;
      });
      req.on('end', function () {
        if (req.url.indexOf('?start_trace_route') !== -1) {
          _traceRoute = [];
        }
        if (req.url.indexOf('?stop_trace_route') !== -1) {
          _traceRoute = null;
        }
        if (_traceRoute !== null) {
          if (req.url.indexOf('?reset_trace_route') !== -1) {
            _traceRoute.length = 0;
          }
          _traceRoute.push(req.url);
        }

        if (Object.keys(router).some(function (route) {
          if (! new RegExp('~' + route).test(req.url)) {
            return false;
          }
          router[route].apply(_this, [ req, res, pdata ]);
          return true;
        })) {
          return;
        }

        // 通常ファイル
        var wait = (req.url.match(/[\?&]wait=(\d+)/i) || [])[1] || 5;
        setTimeout(function () {
          if (_traceRoute !== null) {
            res.setHeader('trace-route', JSON.stringify(_traceRoute));
          }
          file.serve(req, res, function (err) {
            if (err) {
              res.writeHead(err.status, err.headers);
              res.end();
            }
          });
        }, parseInt(wait, 10));
        /*eslint-disable consistent-return*/ return; /*eslint-enable consistent-return*/
      }).resume();
    }).listen(this.httpPort, '0.0.0.0', (function () {
      this.emitter.emit('start', 'http');
    }).bind(this));

    // httpsサーバーも稼働
    var httpsOpts = {
      secureProtocol: 'TLSv1_2_method' // TLS1.2のみ対応
    };
    [ 'key', 'cert' ].forEach(function (pem) {
      httpsOpts[pem] = fs.readFileSync(
        path.join(__dirname, 'pem/' + pem + '.pem'),
        'utf-8'
      );
    });

    https.createServer(httpsOpts, function (req, res) {
      res.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      res.end('hello, https');
    }).listen(this.httpsPort, '0.0.0.0', (function () {
      this.emitter.emit('start', 'https');
    }).bind(this));
  },

  /**
   * 指定したディレクトリのファイル一覧(拡張子なし)を返す
   */
  files: function (dir) {
    return fs.readdirSync(path.join(this.root, dir)).map(function (v) {
      return v.replace(/\.html$/i, '');
    });
  },

  /**
   * 指定したファイルの内容をBase64エンコードした文字列を返す
   */
  toBase64: function (file) {
    return fs.readFileSync(path.join(__dirname, file)).toString('base64');
  },

  /**
   * 指定したファイルの内容をBufferで返す
   */
  readBuffer: function (file) {
    var contents = fs.readFileSync(path.join(__dirname, file));
    return (Buffer.from) ? Buffer.from(contents) : new Buffer(contents);
  },

  /**
   * 指定したファイルの内容をBase64エンコードした文字列を返す
   */
  escapedParam: function () {
    /*jscs:disable disallowQuotedKeysInObjects*/
    /*eslint-disable quote-props*/
    return {
      'あいうえお': {
        'utf-8': '%E3%81%82%E3%81%84%E3%81%86%E3%81%88%E3%81%8A',
        'shift_jis': '%82%A0%82%A2%82%A4%82%A6%82%A8',
        'euc-jp': '%A4%A2%A4%A4%A4%A6%A4%A8%A4%AA'
      },
      'かきくけこ': {
        'utf-8': '%E3%81%8B%E3%81%8D%E3%81%8F%E3%81%91%E3%81%93',
        'shift_jis': '%82%A9%82%AB%82%AD%82%AF%82%B1',
        'euc-jp': '%A4%AB%A4%AD%A4%AF%A4%B1%A4%B3'
      },
      'さしすせそ': {
        'utf-8': '%E3%81%95%E3%81%97%E3%81%99%E3%81%9B%E3%81%9D',
        'shift_jis': '%82%B3%82%B5%82%B7%82%B9%82%BB',
        'euc-jp': '%A4%B5%A4%B7%A4%B9%A4%BB%A4%BD'
      },
      'たちつてと': {
        'utf-8': '%E3%81%9F%E3%81%A1%E3%81%A4%E3%81%A6%E3%81%A8',
        'shift_jis': '%82%BD%82%BF%82%C2%82%C4%82%C6',
        'euc-jp': '%A4%BF%A4%C1%A4%C4%A4%C6%A4%C8'
      },
      'なにぬねの': {
        'utf-8': '%E3%81%AA%E3%81%AB%E3%81%AC%E3%81%AD%E3%81%AE',
        'shift_jis': '%82%C8%82%C9%82%CA%82%CB%82%CC',
        'euc-jp': '%A4%CA%A4%CB%A4%CC%A4%CD%A4%CE'
      },
      'ははははは': {
        'utf-8': '%E3%81%AF%E3%81%AF%E3%81%AF%E3%81%AF%E3%81%AF',
        'shift_jis': '%82%CD%82%CD%82%CD%82%CD%82%CD',
        'euc-jp': '%A4%CF%A4%CF%A4%CF%A4%CF%A4%CF'
      },
      'ひひひひひ': {
        'utf-8': '%E3%81%B2%E3%81%B2%E3%81%B2%E3%81%B2%E3%81%B2',
        'shift_jis': '%82%D0%82%D0%82%D0%82%D0%82%D0',
        'euc-jp': '%A4%D2%A4%D2%A4%D2%A4%D2%A4%D2'
      },
      'ふふふふふ': {
        'utf-8': '%E3%81%B5%E3%81%B5%E3%81%B5%E3%81%B5%E3%81%B5',
        'shift_jis': '%82%D3%82%D3%82%D3%82%D3%82%D3',
        'euc-jp': '%A4%D5%A4%D5%A4%D5%A4%D5%A4%D5'
      },
      'へへへへへ': {
        'utf-8': '%E3%81%B8%E3%81%B8%E3%81%B8%E3%81%B8%E3%81%B8',
        'shift_jis': '%82%D6%82%D6%82%D6%82%D6%82%D6',
        'euc-jp': '%A4%D8%A4%D8%A4%D8%A4%D8%A4%D8'
      },
      'ほほほほほ': {
        'utf-8': '%E3%81%BB%E3%81%BB%E3%81%BB%E3%81%BB%E3%81%BB',
        'shift_jis': '%82%D9%82%D9%82%D9%82%D9%82%D9',
        'euc-jp': '%A4%DB%A4%DB%A4%DB%A4%DB%A4%DB'
      },
      'まみむめも': {
        'utf-8': '%E3%81%BE%E3%81%BF%E3%82%80%E3%82%81%E3%82%82',
        'shift_jis': '%82%DC%82%DD%82%DE%82%DF%82%E0',
        'euc-jp': '%A4%DE%A4%DF%A4%E0%A4%E1%A4%E2'
      }
    };
    /*jscs:enable disallowQuotedKeysInObjects*/
    /*eslint-enable quote-props*/
  },

  /**
   * エラー内容がタイムアウトかどうか判定
   */
  isTimedOut: function (err) {
    return ([ 'ESOCKETTIMEDOUT', 'ETIMEDOUT' ].indexOf(err.message) !== -1);
  },

  /**
   * colorMessageで出力されたメッセージの詳細部分を除去
   */
  stripMessageDetail: function (msg) {
    return msg.replace(/\s+at\s.*?$/, '');
  },

  /**
   * stderr出力をキャプチャ
   */
  hookStderr: function (callback) {
    var capturedText = '';
    var origStderrWrite = process.stderr.write;
    process.stderr.write = function (text) {
      capturedText = strip(text).trim();
    };
    callback(function () {
      return (function () {
        process.stderr.write = origStderrWrite;
        return capturedText;
      })();
    });
  }
};

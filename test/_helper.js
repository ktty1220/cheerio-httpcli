/*eslint max-statements:[1, 100]*/
/*jshint -W100*/
var nstatic = require('node-static');
var http    = require('http');
var path    = require('path');
var strip   = require('strip-ansi');
var each    = require('foreach');
var random  = require('random-string');
var fs      = require('fs');
var qs      = require('querystring');

/**
 * テスト用のヘルパーモジュール本体
 */
module.exports = {
  /**
   * プロパティ
   */

  port: 5555,              // テストサーバーのポート
  root: './test/fixtures', // テストサーバーのドキュメントルート

  /**
   * メソッド
   */

  /**
   * テストHTMLページのURLを作成
   */
  url: function (dir, file) {
    if (! file) {
      file = dir;
      dir = '';
    } else {
      dir += '/';
      file += '.html';
    }
    return 'http://localhost:' + this.port + '/' + dir + file;
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
    var _traceRoute = [];
    var file = new nstatic.Server(this.root, {
      gzip: true,
      cache: 0
    });
    return http.createServer(function (req, res) {
      var pdata = '';
      req.on('data', function (data) {
        pdata += data;
      });
      req.on('end', function () {
        if (req.url.indexOf('?reset_trace_route') !== -1) {
          _traceRoute.length = 0;
        }
        _traceRoute.push(req.url);

        var headers = [];
        if (/~info/.test(req.url)) {
          // アクセス元のヘッダ情報などをレスポンスヘッダにセットして返す
          headers = [
            [ 'request-url', req.url ],
            [ 'request-method', req.method.toUpperCase() ],
            [ 'Set-Cookie', 'session_id=hahahaha' ],
            [ 'Set-Cookie', 'login=1' ]
          ];
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
        }

        if (/~session/.test(req.url)) {
          // セッションID保持
          var setCookie = (/x_session_id=/.test(req.headers.cookie || ''))
            ? req.headers.cookie
            : ('x_session_id=user_' + random({ length: 32 }));
          headers = [
            [ 'Set-Cookie', setCookie ]
          ];
          res.writeHead(200, headers);
          return res.end('<html></html>');
        }

        if (/~redirect/.test(req.url)) {
          // リダイレクト
          var loc = _this.url('manual', 'euc-jp');
          headers = [
            [ 'location', loc ]
          ];
          // ログインフォームから来た場合はログイン情報も
          if (pdata.length > 0) {
            var pq = qs.parse(pdata);
            headers.push([ 'Set-Cookie', 'user=' + pq.user ]);
          }
          res.writeHead(301, headers);
          return res.end('location: ' + loc);
        }

        if (/~404/.test(req.url)) {
          // ソフト404ページ
          return file.serveFile('/error/404.html', 404, {}, req, res);
        }

        if (/~slow/.test(req.url)) {
          // レスポンスに5秒かかるページ
          return setTimeout(function () {
            res.writeHead(200, headers);
            res.end('<html></html>');
          }, 5000);
        }

        if (/~mega/.test(req.url)) {
          // 巨大サイズ
          res.writeHead(200);
          var buf = new Array(1024 * 1024).join().split(',').map(function (v, i, a) {
            return 'a';
          }).join('');
          return res.end(buf);
        }

        // 通常ファイル
        var wait = (req.url.match(/[\?&]wait=(\d+)/i) || [])[1] || 5;
        setTimeout(function () {
          res.setHeader('trace-route', JSON.stringify(_traceRoute));
          file.serve(req, res);
        }, parseInt(wait, 10));
        /*eslint-disable consistent-return*/ return; /*eslint-enable consistent-return*/
      }).resume();
    }).listen(this.port, '0.0.0.0', function () {
      process.stderr.write('%%% server start %%%');
    });
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
    return new Buffer(fs.readFileSync(path.join(__dirname, file)));
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

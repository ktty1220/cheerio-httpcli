/*eslint max-statements:[1, 50]*/
var nstatic = require('node-static');
var http    = require('http');
var path    = require('path');
var each    = require('foreach');
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
      gzip: true
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

        // 通常HTMLファイル
        res.setHeader('trace-route', JSON.stringify(_traceRoute));
        file.serve(req, res);
      }).resume();
    }).listen(this.port, '0.0.0.0');
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
  }
};

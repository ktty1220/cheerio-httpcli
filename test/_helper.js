var nstatic = require('node-static');
var http    = require('http');
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
    qs.split(/&/).forEach(function (ps) {
      var p = ps.split(/=/);
      q[p[0]] = q[p[0]] || [];
      q[p[0]].push(p[1]);
    });
    Object.keys(q).forEach(function (p) {
      if (q[p].length === 1) {
        q[p] = q[p][0];
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
    var server = http.createServer(function (req, res) {
      var pdata = '';
      req.on('data', function (data) {
        pdata += data;
      });
      req.on('end', function () {
        _traceRoute.push(req.url);
        if (/~info/.test(req.url)) {
          // アクセス元のヘッダ情報などをレスポンスヘッダにセットして返す
          var headers = [
            [ 'request-url', req.url ],
            [ 'request-method', req.method.toUpperCase() ],
            [ 'Set-Cookie', 'session_id=hahahaha' ],
            [ 'Set-Cookie', 'login=1' ]
          ];
          var props = [ 'user-agent', 'referer' ];
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
          res.end('<html></html>');
        } else if (/~redirect/.test(req.url)) {
          // リダイレクト
          var loc = _this.url('manual', 'euc-jp');
          var header = [
            [ 'location', loc ]
          ];
          // ログインフォームから来た場合はログイン情報も
          if (pdata.length > 0) {
            var pq = qs.parse(pdata);
            header.push([ 'Set-Cookie', 'user=' + pq.user ]);
          }
          res.writeHead(301, header);
          res.end('location: ' + loc);
        } else if (/~404/.test(req.url)) {
          // ソフト404ページ
          file.serveFile('/error/404.html', 404, {}, req, res);
        } else {
          // 通常HTMLファイル
          file.serve(req, res);
        }
      }).resume();
    }).listen(this.port);
    server.resetTraceRoute = function () {
      _traceRoute = [];
    };
    server.getTraceRoute = function () {
      return _traceRoute;
    };
    return server;
  },

  /**
   * 指定したディレクトリのファイル一覧(拡張子なし)を返す
   */
  files: function (dir) {
    return fs.readdirSync(this.root + '/' + dir).map(function (v) {
      return v.replace(/\.html$/i, '');
    });
  }
};

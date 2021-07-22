const helper = require('./_helper');
const { promisify } = require('util');
const { URL } = require('url');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const uuid = require('uuid-random');
const each = require('foreach');
const iconvLite = require('iconv-lite');
const mime = require('mime-types');
const formidable = require('formidable');
const config = helper.serverConfig;

const port = {
  http: -1,
  https: -1
};

// POSTデータ(無加工)取得
const getRawBody = (req, cb) => {
  const data = [];
  req
    .on('data', (chunk) => {
      data.push(chunk);
    })
    .on('end', () => {
      cb(Buffer.concat(data).toString());
    });
};

// POSTデータ(multipart/form-data)パース
const parseMultiPart = (req, cb) => {
  const enc = req.headers.referer.match(/([^/]+)\.html/)[1];
  const form = formidable({
    multiples: true,
    hash: 'sha256'
  });

  const fields = {};
  form.onPart = (part) => {
    if (part.filename) {
      form.handlePart(part);
      return;
    }
    // パラメータをUTF-8に統一(formidableに任せると無理やりUTF-8に変換して文字化けする)
    const data = [];
    part
      .on('data', (chunk) => {
        data.push(chunk);
      })
      .on('end', () => {
        const name = iconvLite.decode(Buffer.from(part.name), enc);
        const val = iconvLite.decode(Buffer.concat(data), enc);
        fields[name] = val;
      });
  };

  form.parse(req, (err, _fields, files) => {
    if (err) throw err;
    cb(fields, files);
  });
};

/**
 * 特殊な結果を返すURLルーティング設定(/~e404, /~infoなど)
 */
const router = {};

// ソフト404ページ
router.e404 = (req, res) => {
  res.writeHead(404);
  res.end(helper.readBuffer('/error/404.html'));
};

// アクセス情報
router.info = (req, res) => {
  getRawBody(req, (body) => {
    // アクセス元のヘッダ情報などをレスポンスヘッダにセットして返す
    each(
      {
        'request-url': req.url,
        'request-method': req.method.toUpperCase(),
        'set-cookie': ['session_id=hahahaha', 'login=1']
      },
      (val, key) => res.setHeader(key, val)
    );
    each(['user-agent', 'referer', 'accept-language'], (p) => {
      if (!req.headers[p]) return;
      res.setHeader(p, req.headers[p]);
    });
    if (body.length > 0) {
      res.setHeader('post-data', body);
    }
    res.writeHead(200);
    res.end('<html></html>');
  });
};

// セッションID保持
router.session = (req, res) => {
  const setCookie = /x_session_id=/.test(req.headers.cookie || '')
    ? req.headers.cookie
    : `x_session_id=user_${uuid()}`;
  res.setHeader('set-cookie', [setCookie]);
  res.writeHead(200);
  res.end('<html></html>');
};

// リダイレクト
router.redirect = (req, res) => {
  getRawBody(req, (body) => {
    let loc = `http://${config.host}:${port.http}/manual/euc-jp.html`;
    if (/_relative/.test(req.url)) {
      // 相対パスバージョン
      loc = new URL(loc).pathname.substr(1);
    }
    // ログインフォームから来た場合はログイン情報も
    if (body.length > 0) {
      res.setHeader('set-cookie', [`user=${helper.qsparse(body).user}`]);
    }
    res.writeHead(301, {
      location: loc
    });
    res.end(`location: ${loc}`);
  });
};

// アップロード
router.upload = (req, res) => {
  parseMultiPart(req, (fields, files) => {
    const result = {
      fields,
      files: []
    };
    const upfiles = (
      !Array.isArray(files.upload_file) ? [files.upload_file] : files.upload_file
    ).sort((a, b) => (a.name > b.name ? 1 : -1));
    each(upfiles, (uf) => {
      result.files.push({
        name: uf.name,
        size: uf.size,
        hash: uf.hash
      });
      fs.unlinkSync(uf.path);
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result));
  });
};

// レスポンスに5秒かかるページ
router.slow = (req, res) => {
  setTimeout(() => {
    res.writeHead(200);
    res.end('<html></html>');
  }, 5000);
};

// 巨大サイズ(1MB)
router.mega = (req, res) => {
  res.writeHead(200);
  res.end(
    new Array(1024 * 1024)
      .join()
      .split(',')
      .map(() => 'a')
      .join('')
  );
};

// XML
router.xml = (req, res) => {
  const opt = {
    ext: (req.url.match(/\.(\w+)$/) || [])[1] || 'xml'
  };
  if (opt.ext === 'xml') {
    res.setHeader('content-type', 'application/xml');
  }
  res.writeHead(200);
  res.end(helper.readBuffer('xml/rss.xml'));
};

// https
router.https = (req, res) => {
  if (!req.connection.encrypted) {
    res.writeHead(403);
    res.end('https only');
    return;
  }
  res.writeHead(200);
  res.end('hello https');
};

// リダイレクトURL遷移履歴
const history = {};

// サーバーメイン処理
const serverEngine = (req, res) => {
  const redirectId = req.headers['redirect-id'];
  if (redirectId) {
    // リダイレクト履歴を保存する指定がある場合
    history[redirectId] = history[redirectId] || [];
    history[redirectId].push(req.url);
    res.setHeader('redirect-history', JSON.stringify(history[redirectId]));
  }

  // 特殊URL
  const matched = Object.keys(router).some((route) => {
    if (!new RegExp(`/~${route}`).test(req.url)) return false;
    res.setHeader('content-type', 'text/html');
    router[route](req, res);
    return true;
  });
  if (matched) return;

  // 通常ファイル
  const wait = (req.url.match(/[?&]wait=(\d+)/i) || [])[1] || 5;
  setTimeout(() => {
    const file = req.url.replace(/\?.*$/, '');

    // ファイル取得
    let buf = helper.readBuffer(file);
    if (buf == null) {
      res.writeHead(404);
      res.end();
      return;
    }

    // 動的サーバーポートをHTMLファイルに反映(UTF-8のページ限定)
    if (/refresh/.test(file)) {
      buf = buf
        .toString()
        .replace(/{%PORT_HTTP%}/, port.http)
        .replace(/{%PORT_HTTPS%}/, port.https);
    }

    // gzip転送
    if (/gzip/.test(req.headers['accept-encoding'] || '')) {
      res.setHeader('content-encoding', 'gzip');
      buf = zlib.gzipSync(buf);
    }

    res.writeHead(200, {
      'content-length': buf.length,
      'content-type': mime.lookup(file)
    });
    res.end(buf);
  }, wait);
};

// HTTPSサーバー設定
const httpsOpts = {
  secureProtocol: 'TLSv1_2_method' // TLS1.2のみ対応
};
// オレオレ証明書インストール
each(['key', 'cert'], (pem) => {
  httpsOpts[pem] = helper.readBuffer(`../pem/${pem}.pem`).toString();
});

/**
 * サーバー稼働
 */
const httpServer = http.createServer(serverEngine);
const httpsServer = https.createServer(httpsOpts, serverEngine);

/**
 * http/httpsの両サーバーが稼働したら準備完了コールバックを実行
 */
Promise.all([
  promisify(httpServer.listen.bind(httpServer))(0),
  promisify(httpsServer.listen.bind(httpsServer))(0)
]).then(() => {
  port.http = httpServer.address().port;
  port.https = httpsServer.address().port;
  console.info(`@@@ server ready ${JSON.stringify(port)} @@@`);
});

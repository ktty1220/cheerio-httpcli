const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const strip = require('strip-ansi');
const each = require('foreach');
const uuid = require('uuid-random');

/**
 * テストサーバー設定
 */
const serverConfig = {
  host: 'localhost',
  root: path.join(__dirname, 'fixtures')
};

/**
 * テストサーバーアクセスURL作成
 */
const endpoint = (isHttps = false) => {
  const host = serverConfig.host;
  if (isHttps) {
    return `https://${host}:${process.env.CHEERIO_HTTPCLI_TEST_SERVER_PORT_HTTPS}`;
  }
  return `http://${host}:${process.env.CHEERIO_HTTPCLI_TEST_SERVER_PORT_HTTP}`;
};

/**
 * URLパラメータの連想配列化(querystring.parseだとUTF-8しか対応していない)
 */
const qsparse = (qs) => {
  const q = {};
  each(qs.split(/&/), (ps) => {
    const [name, val] = ps.split(/=/);
    q[name] = q[name] || [];
    q[name].push(val);
  });
  each(q, (val, name) => {
    if (val.length === 1) {
      q[name] = q[name][0];
    }
  });
  return q;
};

/**
 * 指定したディレクトリのファイル一覧(拡張子なし)を返す
 */
const files = (dir) =>
  fs.readdirSync(path.join(serverConfig.root, dir)).map((v) => v.replace(/\.html$/i, ''));

/**
 * Tempファイルのパス取得
 */
const tmppath = () => path.join(os.tmpdir(), `${uuid()}.test`);

/**
 * 指定したファイルの内容をBase64エンコードした文字列を返す
 */
const toBase64 = (file) => fs.readFileSync(path.join(serverConfig.root, file)).toString('base64');

/**
 * 指定したファイルの内容をSHA256ハッシュ化した文字列を返す
 */
const toHash = (file) => {
  return crypto.createHash('sha256').update(readBuffer(file)).digest('hex');
};

/**
 * 指定したファイルの内容をBufferで返す
 */
const readBuffer = (file) => {
  const fpath = path.join(serverConfig.root, file);
  if (!fs.existsSync(fpath)) return null;
  return Buffer.from(fs.readFileSync(fpath));
};

/**
 * エラー内容がタイムアウトかどうか判定
 */
const isTimedOut = (err) => ['ESOCKETTIMEDOUT', 'ETIMEDOUT'].includes(err.message);

/**
 * colorMessageで出力されたメッセージの詳細部分を除去
 */
const stripMessageDetail = (msg) => strip(msg).replace(/\s+at\s.*?$/, '');

/**
 * 予め用意された文字列を各エンコーディングで変換してBase64化したものを返す
 */
const escapedParam = () => ({
  あいうえお: {
    'utf-8': '%E3%81%82%E3%81%84%E3%81%86%E3%81%88%E3%81%8A',
    shift_jis: '%82%A0%82%A2%82%A4%82%A6%82%A8',
    'euc-jp': '%A4%A2%A4%A4%A4%A6%A4%A8%A4%AA'
  },
  かきくけこ: {
    'utf-8': '%E3%81%8B%E3%81%8D%E3%81%8F%E3%81%91%E3%81%93',
    shift_jis: '%82%A9%82%AB%82%AD%82%AF%82%B1',
    'euc-jp': '%A4%AB%A4%AD%A4%AF%A4%B1%A4%B3'
  },
  さしすせそ: {
    'utf-8': '%E3%81%95%E3%81%97%E3%81%99%E3%81%9B%E3%81%9D',
    shift_jis: '%82%B3%82%B5%82%B7%82%B9%82%BB',
    'euc-jp': '%A4%B5%A4%B7%A4%B9%A4%BB%A4%BD'
  },
  たちつてと: {
    'utf-8': '%E3%81%9F%E3%81%A1%E3%81%A4%E3%81%A6%E3%81%A8',
    shift_jis: '%82%BD%82%BF%82%C2%82%C4%82%C6',
    'euc-jp': '%A4%BF%A4%C1%A4%C4%A4%C6%A4%C8'
  },
  なにぬねの: {
    'utf-8': '%E3%81%AA%E3%81%AB%E3%81%AC%E3%81%AD%E3%81%AE',
    shift_jis: '%82%C8%82%C9%82%CA%82%CB%82%CC',
    'euc-jp': '%A4%CA%A4%CB%A4%CC%A4%CD%A4%CE'
  },
  ははははは: {
    'utf-8': '%E3%81%AF%E3%81%AF%E3%81%AF%E3%81%AF%E3%81%AF',
    shift_jis: '%82%CD%82%CD%82%CD%82%CD%82%CD',
    'euc-jp': '%A4%CF%A4%CF%A4%CF%A4%CF%A4%CF'
  },
  ひひひひひ: {
    'utf-8': '%E3%81%B2%E3%81%B2%E3%81%B2%E3%81%B2%E3%81%B2',
    shift_jis: '%82%D0%82%D0%82%D0%82%D0%82%D0',
    'euc-jp': '%A4%D2%A4%D2%A4%D2%A4%D2%A4%D2'
  },
  ふふふふふ: {
    'utf-8': '%E3%81%B5%E3%81%B5%E3%81%B5%E3%81%B5%E3%81%B5',
    shift_jis: '%82%D3%82%D3%82%D3%82%D3%82%D3',
    'euc-jp': '%A4%D5%A4%D5%A4%D5%A4%D5%A4%D5'
  },
  へへへへへ: {
    'utf-8': '%E3%81%B8%E3%81%B8%E3%81%B8%E3%81%B8%E3%81%B8',
    shift_jis: '%82%D6%82%D6%82%D6%82%D6%82%D6',
    'euc-jp': '%A4%D8%A4%D8%A4%D8%A4%D8%A4%D8'
  },
  ほほほほほ: {
    'utf-8': '%E3%81%BB%E3%81%BB%E3%81%BB%E3%81%BB%E3%81%BB',
    shift_jis: '%82%D9%82%D9%82%D9%82%D9%82%D9',
    'euc-jp': '%A4%DB%A4%DB%A4%DB%A4%DB%A4%DB'
  },
  まみむめも: {
    'utf-8': '%E3%81%BE%E3%81%BF%E3%82%80%E3%82%81%E3%82%82',
    shift_jis: '%82%DC%82%DD%82%DE%82%DF%82%E0',
    'euc-jp': '%A4%DE%A4%DF%A4%E0%A4%E1%A4%E2'
  }
});

module.exports = {
  serverConfig,
  endpoint,
  qsparse,
  files,
  tmppath,
  toBase64,
  toHash,
  readBuffer,
  isTimedOut,
  stripMessageDetail,
  escapedParam
};

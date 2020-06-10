/**
 * このtsファイルをtscでコンパイルしてエラーにならなければOK的なゆるいチェック
 */
import * as client from '../../cheerio-httpcli';
import * as fs from 'fs';

const url = 'http://foo.bar.baz.co.ne.jp/';
type MainInstance = typeof client;
type Instance = MainInstance | client.ChildInstance;

// 親インスタンス専用チェック
function mainInstanceOnlyCheck(instance: MainInstance) {
  console.log(instance.version);

  // ダウンロード設定関連
  instance.download
    .on('add', (url) => {
      console.log(`ダウンロード登録: ${url}`);
    })
    .on('ready', (stream) => {
      stream.pipe(fs.createWriteStream('/path/to/pipe.write'));
      console.log(`${stream.url.href}をダウンロードしました`);
      console.log(instance.download.state);
      stream.toBuffer((err, buffer) => {
        if (err) throw err;
        fs.writeFileSync('/path/to/buffer.cb', buffer);
      });
      stream
        .on('end', () => {})
        .on('error', console.error);
      stream
        .toBuffer()
        .then((buffer) => {
          fs.writeFileSync('/path/to/buffer.promise', buffer);
        })
        .catch(console.error)
        .finally(() => {
          console.log('buffer save done');
        });
      stream.saveAs('/path/to/saveas.cb', (err) => {
        if (err) throw err;
        console.log('save ok');
      });
      stream
        .saveAs('/path/to/saveas.promise')
        .then(() => {
          console.log('save ok');
        })
        .catch(console.error)
        .finally(() => {
          console.log('saveas done');
        });
    })
    .on('error', (err) => {
      console.error(`${err.url}をダウンロードできませんでした: ${err.message}`);
    })
    .on('end', function (this: client.Download.Manager) {
      console.log('ダウンロードが完了しました', this.state);
    }).parallel = 4;
}

// 基本チェック
function basicCheck(instance: Instance) {
  instance.set('debug', true);
  instance.set('browser', 'edge');
  instance.set('timeout', 3000);
  instance.set(
    'agentOptions',
    {
      secureProtocol: 'TLSv1_2_method'
    },
    true
  );
  console.log(instance.headers);

  instance.fetch(url, (_err, $, _res, _body) => {
    const docInfo = $.documentInfo();
    console.log(docInfo.url);
    console.log(docInfo.encoding);
    console.log($.xml());
    $('a').css('color', 'black').tick().url({
      absolute: false
    });
    $('img.thumbnail').download();
    $('button')
      .eq(3)
      .click()
      .then((result) => {
        const key = 'hoge';
        console.log(
          result.response.cookies[key],
          result.$('#content').entityHtml(),
          result.$('form').field()
        );
      })
      .catch(console.error)
      .finally(() => console.log('done'));
  });

  instance.fetch(url, 'euc-jp').then((result2) => {
    console.log(result2.response.headers);
  });

  instance.importCookies(instance.exportCookies());
  const cookies: client.Cookie[] = JSON.parse(fs.readFileSync('/path/to/cookie.json', 'utf-8'));
  instance.importCookies(cookies);
  instance.importCookies([{
    name: 'foo',
    value: 'bar',
    domain: 'example.com',
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: true,
    sameSite: 'Strict'
  }]);

  const expCookie = instance.exportCookies()[0];
  console.log(expCookie.name);
  console.log(expCookie.value);
  console.log(expCookie.url);
  console.log(expCookie.domain);
  console.log(expCookie.path);
  console.log(expCookie.expires);
  console.log(expCookie.httpOnly);
  console.log(expCookie.secure);
  console.log(expCookie.sameSite);
}

// 同期チェック
function syncCheck(instance: Instance) {
  const { error, $, response, body } = instance.fetchSync(url, { q: 'hoge' });
  console.log(error, $, response, body);
}

// #18
function asyncCheck(instance: Instance) {
  const wrapper = async (u: string): Promise<client.CheerioStaticEx> => {
    const result = await instance.fetch(u);
    const type: string = result.response.headers['content-type'] as string;

    // rejects
    if (result.error !== undefined && result.error !== null) {
      throw new Error('happend-error');
    }

    if (!/text\/html/.test(type)) {
      throw new Error('not-html');
    }

    // resolve result
    return result.$;
  };

  wrapper(url).then((result) => {
    console.dir(result);
  });
}

// 子インスタンス作成
const child = client.fork();
const instances: Instance[] = [client, child];

// versionプロパティは親インスタンスにしかない
const isMainInstance = (instance: any): instance is MainInstance => {
  return instance.version !== undefined;
};

// 各種チェック
instances.forEach((instance) => {
  if (isMainInstance(instance)) {
    mainInstanceOnlyCheck(instance);
  }
  basicCheck(instance);
  syncCheck(instance);
  asyncCheck(instance);
});

// このtsファイルをtscでコンパイルしてエラーにならなければOK的なゆるいチェック
import * as cli from '../../cheerio-httpcli';
import * as fs from 'fs';

cli.set('debug', true);
cli.set('browser', 'edge');
cli.set('timeout', 3000);
cli.set('agentOptions', {
  secureProtocol: 'TLSv1_2_method'
}, true);
console.info(cli.headers);

cli.download
.on('ready', (stream) => {
  stream.pipe(fs.createWriteStream('/path/to/image.png'));
  console.info(`${stream.url.href}をダウンロードしました`);
})
.on('error', (err) => {
  console.error(`${err.url}をダウンロードできませんでした: ${err.message}`);
})
.on('end', () => {
  console.info('ダウンロードが完了しました');
})
.parallel = 4;

const url = 'http://foo.bar.baz.co.ne.jp/';
cli.fetch(url, (_err, $, _res, _body) => {
  const docInfo = $.documentInfo();
  console.info(docInfo.url);
  console.info(docInfo.encoding);
  console.info($.xml());
  $('a').css('color', 'black').tick().url({
    absolute: false
  });
  $('img.thumbnail').download();
  $('button').eq(3).click()
  .then((result) => {
    const key = 'hoge';
    console.info(
      result.response.cookies[key],
      result.$('#content').entityHtml(),
      result.$('form').field()
    );
  })
  .catch(console.error)
  .finally(() => console.info('done'));
});

cli.fetch(url, 'euc-jp')
.then((result2) => {
  console.info(result2.response.headers);
});

{
  const { error, $, response, body } = cli.fetchSync(url, { q: 'hoge' });
  console.info(error, $, response, body);
}

// #18
{
  const wrapper = async (u: string): Promise<cli.CheerioStaticEx> => {
    const result = await cli.fetch(u);
    const type: string = result.response.headers['content-type'] as string;

    /* rejects */
    if (result.error !== undefined && result.error !== null) {
      throw new Error('happend-error');
    }

    if (! /text\/html/.test(type)) {
      throw new Error('not-html');
    }

    /* resolve result */
    return result.$;
  };

  wrapper(url).then((result) => {
    console.dir(result);
  });
}

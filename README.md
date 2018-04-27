# cheerio-httpcli - Node.js用WEBスクレイピングモジュール

[![npm-version](https://img.shields.io/npm/v/cheerio-httpcli.svg)](https://npmjs.org/package/cheerio-httpcli)
[![npm-download](https://img.shields.io/npm/dm/cheerio-httpcli.svg)](https://npmjs.org/package/cheerio-httpcli)
[![npm-deps](https://david-dm.org/ktty1220/cheerio-httpcli.svg)](https://david-dm.org/ktty1220/cheerio-httpcli)
[![node-version](https://img.shields.io/node/v/gh-badges.svg)](https://npmjs.org/package/cheerio-httpcli)
[![test-coverage](https://codeclimate.com/github/ktty1220/cheerio-httpcli/badges/coverage.svg)](https://codeclimate.com/github/ktty1220/cheerio-httpcli/coverage)
[![code-climate](https://codeclimate.com/github/ktty1220/cheerio-httpcli/badges/gpa.svg)](https://codeclimate.com/github/ktty1220/cheerio-httpcli)
[![license](https://img.shields.io/npm/l/cheerio-httpcli.svg)](https://github.com/ktty1220/cheerio-httpcli/blob/master/LICENSE)

Node.jsでWEBページのスクレイピングを行う際に必要となる文字コードの変換と、[cheerio](http://npmjs.org/package/cheerio)によってパースしたHTMLをjQueryのように操作できるHTTPクライアントモジュールです。

## 特徴

1. 取得先WEBページの文字コードを自動で判定してHTMLをUTF-8に変換
2. UTF-8に変換したHTMLをjQueryのように操作可能
3. フォームの送信やリンクのクリックをエミュレート
4. Node.jsお馴染みのコールバック形式と最近の流行であるプロミス形式どちらにも対応
5. 同期リクエスト対応
6. `$('img')`要素画像のダウンロード(LazyLoad対応)
7. `$('a,img,script,link')`要素のURLを絶対パスで取得可能
8. ブラウザ指定による簡単User-Agent切り替え機能
9. 現在のクッキーの内容を簡単に取得(読み取り専用)
10. XMLドキュメントを自動判別してパース処理を切り替え

> 静的なHTMLをベースに処理するモジュールなのでSPAなどクライアントサイドのJavaScriptによってコンテンツを取得/変更するタイプのWEBページには対応していません。

## サンプル

```js
var client = require('cheerio-httpcli');

// Googleで「node.js」について検索する。
var word = 'node.js';

client.fetch('http://www.google.com/search', { q: word }, function (err, $, res, body) {
  // レスポンスヘッダを参照
  console.log(res.headers);

  // HTMLタイトルを表示
  console.log($('title').text());

  // リンク一覧を表示
  $('a').each(function (idx) {
    console.log($(this).attr('href'));
  });
});
```

同梱の「example/google.js」はGoogle検索結果の一覧を取得するサンプルです。参考にしてください。

## インストール

```sh
npm install cheerio-httpcli
```

## API目次

* [メソッド](#%E3%83%A1%E3%82%BD%E3%83%83%E3%83%89)
  * [fetch()](#fetchurl-get-param-encode-callback)
  * [fetchSync()](#fetchsyncurl-get-param-encode)
  * [set()](#setname-value-nomerge)
  * [setBrowser()](#setbrowserbrowser-type)
  * [setIconvEngine()](#seticonvengineiconv-module-name)
  * [reset()](#reset)
* [プロパティ](#%E3%83%97%E3%83%AD%E3%83%91%E3%83%86%E3%82%A3)
  * [version](#version-readonly)
  * [browser](#browser)
  * [iconv](#iconv)
  * [headers](#headers)
  * [timeout](#timeout)
  * [gzip](#gzip)
  * [referer](#referer)
  * [followMetaRefresh](#followmetarefresh)
  * [maxDataSize](#maxdatasize)
  * [forceHtml](#forcehtml)
  * [agentOptions](#agentoptions)
  * [debug](#debug)
  * [download](#download-readonly)
* [cheerioオブジェクトの独自拡張](#cheerio%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%AE%E7%8B%AC%E8%87%AA%E6%8B%A1%E5%BC%B5)
  * [$.documentInfo()](#documentinfo)
  * [$(_link-element_ or _submit-element_).__click__()](#link-elementclick-callback-)
  * [$(_link-element_ or _submit-element_).__clickSync__()](#link-elementclicksync)
  * [$(_form-element_).__submit__()](#form-elementsubmit-param-callback-)
  * [$(_form-element_).__submitSync__()](#form-elementsubmitsync-param-)
  * [$(_form-element_).__field__()](#form-elementfield-name-value-onnotfound-)
  * [$(_checkbox-element_ or _radio-element_).__tick__()](#checkbox-element-or-radio-elementtick)
  * [$(_checkbox-element_ or _radio-element_).__untick__()](#checkbox-element-or-radio-elementuntick)
  * [$(_link-element_ or _image-element_).__url__()](#link-element-or-image-elementurl-filter-src-attr-)
  * [$(_image-element_).__download__()](#image-elementdownload-src-attr-)
  * [$(_element_).__entityHtml__()](#elemententityhtml)

## メソッド

### fetch(url[, get-param, encode, callback])

`url`で指定したWEBページをGETメソッドで取得し、文字コードの変換とHTMLパースを行い`callback`関数に返します。

`callback`関数には以下の4つの引数が渡されます。

1. Errorオブジェクト
2. `cheerio.load()`でHTMLコンテンツをパースしたオブジェクト(独自拡張版)
3. requestモジュールの`response`オブジェクト(独自拡張版)
4. UTF-8に変換したHTMLコンテンツ

#### 各種引数の指定

* GET時にパラメータ(`?foo=bar&hoge=fuga`)を付加する場合は第2引数の`get-param`に連想配列で指定します。
* 予め取得対象のWEBページのエンコーディングが分かっている場合は`encode`に`sjis`や`euc-jp`などの文字列をセットすることで自動判定による誤判定(滅多に発生しませんが)を防止することができます。
* `get-param`、`encode`、場合によっては`callback`も省略可能です。

    ```js
    // get-paramとencodeを省略 => GETパラメータ指定なし & エンコーディング自動判定
    client.fetch('http://hogehoge.com/fuga.html', function (err, $, res, body) {
      ...
    });

    // get-paramを省略 => GETパラメータ指定なし & エンコーディング指定(sjis)
    client.fetch('http://hogehoge.com/fuga.html', 'sjis', function (err, $, res, body) {
      ...
    });

    // encodeを省略 => GETパラメータ指定(?foo=bar) & エンコーディング自動判定
    client.fetch('http://hogehoge.com/fuga.html', { foo: 'bar' }, function (err, $, res, body) {
      ...
    });

    // url以外全部省略 => GETパラメータ指定なし & エンコーディング自動判定 & プロミス形式(後述)
    client.fetch('http://hogehoge.com/fuga.html')
    .then(function (result) {
      ...
    });
    ```

#### プロミス形式での呼び出し

`fetch()`の第4引数である`callback`関数を省略すると、戻り値としてPromiseオブジェクトが返ります。先ほどのサンプルをプロミス形式で呼び出すと以下のようになります。

```js
var client = require('cheerio-httpcli');

// Googleで「node.js」について検索する。
var word = 'node.js';

// callbackを指定しなかったのでPromiseオブジェクトが返る
var p = client.fetch('http://www.google.com/search', { q: word })
p.then(function (result) {
  // レスポンスヘッダを参照
  console.log(result.response.headers);

  // HTMLタイトルを表示
  console.log(result.$('title').text());

  // リンク一覧を表示
  result.$('a').each(function (idx) {
    console.log(result.$(this).attr('href'));
  });
})

p.catch(function (err) {
  console.log(err);
});

p.finally(function () {
  console.log('done');
});
```

`callback`関数を指定しない`fetch()`の戻り値を`p`変数が受け取り、その`p`変数を通して`then`(正常終了時)および`catch`(エラー発生時)の処理を行っています。また、正常終了でもエラーでも必ず最後に通る処理である`finally`も使用できます。

`then`に渡されるパラメータはコールバック形式で呼び出した際に`callback`関数に渡されるものと同じですが、第1引数のオブジェクトにまとめて入っているという点で異なるのでご注意ください。

* `error` ... Errorオブジェクト
* `$` ... `cheerio.load()`でHTMLコンテンツをパースしたオブジェクト(独自拡張版)
* `response` ... requestモジュールの`response`オブジェクト(独自拡張版)
* `body` ... UTF-8に変換したHTMLコンテンツ

```js
.then(function (result) {
  console.log(result);
  // => {
  //      error: ...,
  //      $: ...,
  //      response: ...,
  //      body: ...
  //    };
});
```

##### プロミス形式を活かした使い方

とあるサイトのトップページにアクセスして、その中のとあるページに移動して...というように順を追ってWEBページに潜っていきたい場合などもメソッドチェーンでこんな感じに書くことができます。

```js
var client = require('cheerio-httpcli');

client.fetch(<TOPページのURL>)
.then(function (result) {
  // 何か処理
  return client.fetch(<ページAのURL>);    // Promiseオブジェクトを返す
})
.then(function (result) {
  // 何か処理
  return client.fetch(<ページA-1のURL>);  // Promiseオブジェクトを返す
})
.then(function (result) {
  // 何か処理
  return client.fetch(<ページA-2のURL>);  // Promiseオブジェクトを返す
})
.catch(function (err) {
  // どこかでエラーが発生
  console.log(err);
})
.finally(function () {
  // TOPページ => ページA => ページA-1 => ページA-2の順にアクセスした後に実行される
  // エラーが発生した場合もcatchの処理後に実行される
  console.log('done');
});
```

実体は[rsvp](http://npmjs.org/package/rsvp)のPromiseオブジェクトなので、詳細はそちらのドキュメントをご覧ください。

> `fetch()`の第4引数の`callback`関数を指定した場合はPromiseオブジェクトは返しません。したがってコールバック形式で呼び出しつつPromiseオブジェクトで何かをするということはできません。

### fetchSync(url[, get-param, encode])

非同期で実行される`fetch()`の同期版(リクエストが完了するまで次の行に進まない)となります。`fs.readFile()`に対する`fs.readFileSync()`の関係と同じような意味合いになります。

* 呼び出し時のパラメータは`fetch()`のプロミス形式と同様です。
* 戻り値はプロミス形式の`then`に渡されるオブジェクトと同様の形式です。

```js
var client = require('cheerio-httpcli');

var result1 = client.fetchSync('http://foo.bar.baz/');
console.log(result1);
// => {
//    error: ...,
//    $: ...,
//    response: ...,
//    body: ...
// }

console.log(result1.$('title')); // => http://foo.bar.baz/のタイトルが表示される

var result2 = client.fetchSync('http://hoge.fuga.piyo/');
console.log(result2.$('title')); // => http://hoge.fuga.piyo/のタイトルが表示される
```

> * 同期リクエストは、外部スクリプトをspawnSync()で実行して処理が完了するまで待つ、という形で実装しているのでパフォーマンスは非常に悪いです(非同期リクエストの10倍程度は時間がかかります)。したがって、実装しておいてなんですが、基本は非同期リクエストで処理を行い、どうしてもここだけは同期リクエストにしたいといった場合のみ、という使い方をお勧めします。
> * 同期リクエストの戻り値内のレスポンスはresponse.toJSON()されたものなので非同期版とは内容が若干異なります。statusCodeやheaders、requestなどの主要プロパティは共通して使用できるので特に大きな問題はないかと思いますが、特殊な使い方をする場合には注意が必要です。

### set(name, value, nomerge)

`name`で指定したプロパティに値`value`を設定するメソッドです。
オブジェクトはマージされます。`nomerge`が`true`の時はマージしません。

```js
var client = require('cheerio-httpcli');

client.set('timeout', 10000);     // タイムアウトを30秒から10秒へ変更
client.set('headers', {           // リクエストヘッダのrefereのみを変更
  referer: 'http://hoge.fuga/piyo.html'
});
client.set('headers', {}, true);  // リクエストヘッダを空に
```

オブジェクトの場合、キーに対する値に`null`をセットするとその値は削除されます。

```js
// [before]
// client.headers => {
//   lang: 'ja-JP',
//   referer: 'http://hoge.fuga/piyo.html',
//   'user-agent': 'my custom user-agent'
// }

client.set('headers', {
  referer: null
});

// [after]
// client.headers => {
//   lang: 'ja-JP',
//   'user-agent': 'my custom user-agent'
// }
```

存在するプロパティについては [プロパティ](#%E3%83%97%E3%83%AD%E3%83%91%E3%83%86%E3%82%A3) を参照してください。

> 現状ではTypeScript上でのプロパティ更新用のメソッドですが、直接プロパティに値を代入する方式は将来的に廃止する予定です。

### setBrowser(browser-type)

ブラウザごとのUser-Agentをワンタッチで設定するメソッドです。

```js
var client = require('cheerio-httpcli');

client.setBrowser('chrome');    // GoogleChromeのUser-Agentに変更
client.setBrowser('android');   // AndroidのUser-Agentに変更
client.setBrowser('googlebot'); // GooglebotのUser-Agentに変更
```

~~User-Agentを指定したブラウザのものに変更した場合は`true`、対応していないブラウザを指定するとUser-Agentは変更されずに`false`が返ります。~~

> `0.7`から値を返さないようになりました。

対応しているブラウザは以下のとおりです。

* ie
* edge
* __chrome__ `default`
* firefox
* opera
* vivaldi
* safari
* ipad
* iphone
* ipod
* android
* ps4
* 3ds
* googlebot

なお、細かいバージョンの指定まではできないので、そういった指定も行いたい場合は手動で以下のようにUser-Agentを指定してください。

```js
// IE6のUser-Agentを手動で指定
client.set('headers', {
  'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)'
});
```

> `setBrowser()`は将来的に削除予定です。代わりに以下のように`set()`メソッドを使用するようにしてください。

```js
client.set('browser', 'firefox');
```

### setIconvEngine(iconv-module-name)

cheerio-httpcliは、実行時にインストールされているiconv系のモジュールをチェックして利用するモジュールを自動的に決定しています。優先順位は以下のとおりです。

1. iconv
2. iconv-lite

iconv-liteはcheerio-httpcliのインストール時に依存モジュールとして一緒にインストールされますが、ネイティブモジュールであるiconvがインストールされている場合、処理速度や対応文字コードの多さというメリットがあるそちらを優先してロードするようになっています。

> バージョン0.3.1までは最優先はiconv-jpでしたが、長期間メンテされていないこととNode.js 0.12系でコンパイルできなくなっている現状を考慮してデフォルトの変換エンジン候補から除外しました。
>
> あえて`setIconvEngine()`でiconv-jpを指定することは可能ですが非推奨です。

このメソッドは自動的にロードされたiconv系モジュールを破棄して、使用するiconv系モジュールを手動で指定するためのものです。モジュールテスト時の切り替え用メソッドなので基本的には実用性はありません。

`iconv-module-name`には使用するiconv系モジュール名(`iconv`, `iconv-lite`, `iconv-jp`)のいずれかの文字列を指定します。

##### サンプル

```js
var client = require('cheerio-httpcli');

// あえてiconv-liteを使用
client.setIconvEngine('iconv-lite');
client.fetch( ...
```

> `setIconvEngine()`は将来的に削除予定です。代わりに以下のように`set()`メソッドを使用するようにしてください。

```js
client.set('iconv', 'iconv-lite');
```

### reset()

cheerio-httpcliはシングルインスタンスで動作するモジュールなので、そのプロセスが動作している間は各種設定やクッキーを共有して保持し続けます。

`reset()`を実行すると、設定情報やクッキーをすべて初期化してプロセス起動時と同じ状態に戻します。

## プロパティ

各プロパティは以下のように取得、更新します。

```js
// バージョン情報を表示
console.log(client.version);

// タイムアウト時間を変更
client.set('timeout', 5000);

// [非推奨] 直接更新することも可能ですが将来的に不可となります
client.timeout = 3000;
```

### version `readonly`

cheerio-httpcliのバージョン情報です。

### browser

`set()`や`setBrowser()`でセットしたブラウザ名です(`ie`、`chrome`など)。

未設定の場合は`null`、手動でUser-Agentを設定した場合は`custom`と入っています。

※未設定時には初回`fetch()`時に`chrome`がセットされます。

### iconv

使用中のiconv系モジュール名です(`iconv`、`iconv-lite`、`iconv-jp`のいずれか)。

### headers

requestモジュールで使用するリクエストヘッダ情報の連想配列です。デフォルトでは何も指定されていませんが、`fetch()`実行時にUser-Agentが空の場合は自動的にUser-AgentにGoogleChromeの情報が入ります。

### timeout

requestモジュールで指定するタイムアウト情報をミリ秒で指定します。デフォルトは`30000`(30秒)となっています。

### gzip

サーバーとの通信にgzip転送を使用するかどうかを真偽値で指定します。デフォルトは`true`(gzip転送する)です。

### referer

リファラを自動でセットするかどうかの指定です。`true`にすると1つ前に`fetch()`したページのURLが自動でリクエストヘッダのRefererにセットされます。デフォルトは`true`です。

### followMetaRefresh

`<meta http-equiv="refresh" content="0;URL=...">`といったMETAタグをHTML内に発見した場合に自動でそのURLにリダイレクトします。ただし、`<!--[if IE]>～<![endif]-->`のようなIE条件付きコメント内にある場合はリダイレクトしません。デフォルトは`false`です。

> Google検索をする場合は`followMetaRefresh`は`false`にしてください。
>
> Googleの検索結果HTMLには常にMETAタグのRefresh指定が入っているので(しかも毎回微妙に異なるURL)、リダイレクトがループして最終的にエラーになります。

### maxDataSize

`fetch()`などで受信するデータの限界量を数値(バイト数)で指定します。この値を超えるサイズを受信した段階でエラーが発生します。ユーザーから入力されたURLを解析する用途などにおいて、不用意に大きいデータを読み込んでしまい回線を占有する可能性がある場合に指定しておいた方が良いでしょう。

> 画像のダウンロード時には適用されません。

デフォルトは`null`(制限なし)です。

```js
var client = require('cheerio-httpcli');

// 受信料制限を1MBに指定
client.set('maxDataSize', 1024 * 1024);

// 1MB以上ののHTMLを指定
client.fetch('http://big.large.huge/data.html', function (err, $, res, body) {
  console.log(err.message); // => 'data size limit over'
});
```

なお、`maxDataSize`を超えた場合は途中まで受信したデータは破棄されます。

### forceHtml

cheerio-httpcliは取得したページがXMLであると判別した場合、自動的にcheerioのXMLモードを有効にしてコンテンツをパースします(`Content-Type`とURLの拡張子を見て判別しています)。

`true`にするとこの自動判別を無効にして常にHTMLモードでコンテンツをパースするようになります。デフォルトは`false`(自動判別する)です。

### agentOptions

主にSSL接続などのセキュリティの設定を行うオプションです。cheerio-httpcli内部で使用しているrequestモジュールにそのまま渡されます。デフォルトは空連想配列です。

基本的には何も設定する必要はありませんが、httpsページへのアクセスができない場合にこのオプションを設定することにより解決する可能性があります。設定方法などの詳細は[requestモジュールのドキュメント](https://github.com/request/request#using-optionsagentoptions)を参照してください。

```js
// TLS1.2での接続を強制する
client.set('agentOptions', {
  secureProtocol: 'TLSv1_2_method'
});
```

### debug

`true`にするとリクエストの度にデバッグ情報を出力します(`stderr`)。デフォルトは`false`です。

```js
var client = require('cheerio-httpcli');

// デバッグ表示ON
client.set('debug', true);
client.fetch( ...
```

### download `readonly`

ファイルダウンロードマネージャーオブジェクトです。このオブジェクトを通してファイルダウンロードに関する設定を行います(詳細は[$(_image-element_).download()](#image-elementdownload-src-attr-)を参照)。

## cheerioオブジェクトの独自拡張

cheerio-httpcliではcheerioオブジェクトのprototypeを拡張していくつかの便利メソッドを実装しています。

### $.documentInfo()

取得したWEBページに関する情報(`url`、`encoding`、`isXml`)を取得できます。

```js
client.fetch('http://hogehoge/', function (err, $, res, body) {
  var docInfo = $.documentInfo();
  console.log(docInfo.url);      // http://hogehoge/
  console.log(docInfo.encoding); // 'utf-8'
  console.log(docInfo.isXml);    // XMLモードでパースされた場合はtrue
});
```

`fetch()`で指定したURLがリダイレクトされた場合はリダイレクト先のURLが`url`に入ります。`encoding`に関しても同様で、最終的に到達したページのエンコーディングが入ります。

### $(_link-element_).click([ callback ])

`a`要素もしくは送信ボタン系要素で使用可能ですが、それぞれ挙動が異なります。

#### `a`要素

`href`属性に指定されているURLと取得したページのURLを組み合わせて移動先のURLを作成し、`fetch()`を実行します。

```js
client.fetch('http://hogehoge/')
.then(function (result) {
  // id="login"の子のリンクをクリック(プロミス形式)
  return result.$('#login a').click();
})
.then(function (result) {
  // クリックした先のURL取得後の処理
});
```

注意点として、この`click()`メソッドはjavascriptリンクや`onclick="..."`などの動的処理には対応していません。あくまでも`href`のURLに簡単にアクセスできるための機能です。

#### 送信ボタン系要素

`input[type=submit]`、`button[type=submit]`、`input[type=image]`要素が対象となります。

押された送信ボタンが所属するフォーム内に配置されている`input`や`checkbox`などのフォーム部品から送信パラメータを自動作成し、`action`属性のURLに`method`属性でフォーム送信を実行します。

```js
client.fetch('http://hogehoge/')
.then(function (result) {
  var form = $('form[name=login]');

  // ユーザー名とパスワードをセット(field()については後述)
  form.field({
    user: 'guest',
    pass: '12345678'
  });

  // 送信ボタンを押してフォームを送信(コールバック形式)
  // ※上で指定したuserとpass以外はデフォルトのパラメータとなる
  form.find('input[type=submit]').click(function (err, $, res, body) {
    // フォーム送信後に移動したページ取得後の処理
  });
})
```

cheerio-httpcliは内部でクッキーも保持するので、ログインが必要なページの取得などもこのフォーム送信でログインした後に巡回できるようになります。

なお、こちらも動的処理である`onsubmit="xxx"`や送信ボタンの`onclick="..."`には対応していません。

#### 共通の仕様

* `$(...).click()`時の対象要素が複数ある場合は先頭の要素に対してのみ処理が行われます。
* `fetch()`と同様に引数の`callback`関数の有無でコールバック形式とプロミス形式の指定を切り替えられます。

### $(_link-element_).clickSync()

非同期で実行される`click()`の同期版となります。

* 戻り値はプロミス形式の`then`に渡されるオブジェクトと同様の形式です。

#### `a`要素

```js
var client = require('cheerio-httpcli');

// fetch()は非同期で行ってその中で同期リクエストする場合
client.fetch('http://foo.bar.baz/', function (err, $, res, body) {
  var result = $('a#login').clickSync();
  console.log(result);
  // => {
  //      error: ...,
  //      $: ...,
  //      response: ...,
  //      body: ...
  //    }
});
```

#### 送信ボタン系要素

```js
var client = require('cheerio-httpcli');

// フォームのあるページに同期リクエスト
var result1 = client.fetchSync('http://foo.bar.baz/');
var form = result1.$('form[name=login]');

form.field({
  user: 'guest',
  pass: '12345678'
});

// フォーム送信も同期リクエスト
var result2 = form.find('input[type=submit]').clickSync();

// フォーム送信後に移動したページ取得後の処理
  .
  .
  .
```

### $(_form-element_).submit([ param, callback ])

`form`要素でのみ使用できます。

指定したフォーム内に配置されている`input`や`checkbox`などのフォーム部品から送信パラメータを自動作成し、`action`属性のURLに`method`属性でフォームを送信します。`fetch()`と同様に引数の`callback`関数の有無でコールバック形式とプロミス形式の指定を切り替えられます。

また、フォーム送信パラメータは`param`引数で指定した連想配列の内容で上書きできるので、利用する側ではパラメータを変更したい項目だけ指定するだけで済みます。

```js
client.fetch('http://hogehoge/')
.then(function (result) {
  // ユーザー名とパスワードだけ入力して、あとはフォームのデフォルト値で送信する
  var loginInfo = {
    user: 'guest',
    pass: '12345678'
  };

  // name="login"フォームを送信(コールバック形式)
  result.$('form[name=login]').submit(loginInfo, function (err, $, res, body) {
    // フォーム送信後に移動したページ取得後の処理
  });
})
```

その他の仕様は`$(submit-element).click()`と同様です。

* `onsubmit="xxx"`には対応していません。
* `$(...)`で取得した`form`要素が複数ある場合は先頭の要素に対してのみ実行されます。

#### $(_submit-element_).click()との違い

`$(submit-element).click()`は押したボタンのパラメータがサーバーに送信されますが、`$(form-element).submit()`は送信系ボタンのパラメータをすべて除外した上でサーバーに送信します。

##### 例

```html
<form>
  <input type="text" name="user" value="guest">
  <input type="submit" name="edit" value="edit">
  <input type="submit" name="delete" value="delete">
</form>
```

上記フォームは1フォーム内に複数の`submit`ボタンがあります。それぞれのメソッドによるこのフォームの送信時のパラメータは以下のようになります。

```js
// $(submit-element).click()の場合
$('[name=edit]').click(); // => '?user=guest&edit=edit'

// $(form-element).submit()の場合
$('form').submit(); // => '?user=guest'
```

このように1フォーム内に複数の`submit`ボタンがある場合、サーバー側では押されたボタンのパラメータで処理を分岐させている可能性があるので、`$('form').submit()`だと正常な結果が得られないかもしれません。

実際にブラウザから手動でフォームを送信した挙動に近いのは`$(submit-element).click()`になります。

### $(_form-element_).submitSync([ param ])

非同期で実行される`submit()`の同期版となります。戻り値はプロミス形式の`then`に渡されるオブジェクトと同様の形式です。

* 呼び出し時のパラメータは`submit()`のプロミス形式と同様です。
* 戻り値はプロミス形式の`then`に渡されるオブジェクトと同様の形式です。

```js
var client = require('cheerio-httpcli');

// トップページにアクセス(ここも同期リクエストにすることも可能)
client.fetch('http://foo.bar.baz/', function (err, $, res, body) {
  // 同期リクエストでログインページに移動
  var result1 = $('a#login').clickSync();
  // 同期リクエストでログインフォーム送信
  var result2 = result1.$('form[name=login]').submitSync({
    account: 'guest',
    password: 'guest'
  });
  // ログイン結果確認
  console.log(result2.response.statusCode);
});
```

### $(_form-element_).field([ name, value, onNotFound ])

`$(...).css()`や`$(...).attr()`と同じ感覚でフォーム部品の値を取得/指定できるメソッドです。呼び出し時の引数によって動作が変わります。`form`要素で使用可能です。

#### `name`:文字列、`value`:なし

`form-element`内の部品`name`の現在の値を取得します。

```js
// userのvalueを取得
$('form[name=login]').field('user'); // => 'guest'
```

#### `name`:文字列、`value`:文字列 or 配列

`form-element`内の部品`name`の値を`value`に変更します。同一`name`の複数チェックボックスや複数選択`select`の場合は配列でまとめて選択値を指定できます。

```js
// passのvalueを設定
$('form[name=login]').field('pass', 'admin');

// 複数選択可能部品の場合
$('form[name=login]').field('multi-select', [ 'hoge', 'fuga', 'piyo' ]);
```

#### `name`:連想配列、`value`:なし

指定された連想配列内の`name`:`value`を一括で`form-element`内の部品に反映します。

```js
// 一括で設定
$('form[name=login]').field({
  user: 'foo',
  pass: 'bar'
});
```

#### 引数なし

`form-element`内の全部品の`name`と`value`を連想配列で取得します。

```js
// 一括で取得
$('form[name=login]').field();
// => {
//      user: 'foo',
//      pass: 'bar',
//      remember: 1
//    }
```

#### onNotFound

第3引数の`onNotFound`は、部品に値を設定する際に参照されるオプションです。指定した`name`の部品がフォーム内に存在しなかった時の動作を以下のいずれかの文字列で指定します。

* `throw` ...  例外が発生します。
* `append` ... 新規にその`name`部品を作成してフォームに追加します(文字列の場合は`hidden`、配列の場合は`checkbox`)。

`onNotFound`を指定しなかった場合は例外は発生せず、新規に`name`部品の追加もしません(何もしない)。

```js
// loginフォーム内にabcというnameの部品がない時の動作

$('form[name=login]').field('abc', 'hello', 'throw');
// => 例外: Element named 'abc' could not be found in this form

$('form[name=login]').field('abc', 'hello', 'append');
// => <input type="hidden" name="abc" value="hello"> を追加

$('form[name=login]').field('abc', [ 'hello', 'world' ], 'append');
// => <input type="checkbox" name="abc" value="hello" checked>
//    <input type="checkbox" name="abc" value="world" checked> を追加

$('form[name=login]').field('abc', 'hello');
// => 何もしない
```

### $(_checkbox-element_ or _radio-element_).tick()

指定したチェックボックス、ラジオボタンの要素を選択状態にします。対象の要素が元から選択状態の場合は何も変化しません。

対象要素が複数ある場合は対象すべてを選択状態にしますが、ラジオボタンに関しては同グループ内で複数を選択状態にすることはできないので、最初に該当した要素を選択状態にします。

```js
$('input[name=check_foo]').tick();          // => check_fooを選択状態に
$('input[type=checkbox]').tick();           // => 全チェックボックスを選択状態に
$('input[name=radio_bar][value=2]').tick(); // => radio_barのvalueが2のラジオボタンを選択状態に
$('input[type=radio]').tick();              // => 各ラジオボタングループの先頭を選択状態に
```

### $(_checkbox-element_ or _radio-element_).untick()

指定したチェックボックス、ラジオボタンの要素を非選択状態にします。対象の要素が元から非選択状態の場合は何も変化しません。

対象要素が複数ある場合は対象すべてを非選択状態にします。

```js
$('input[name=check_foo]').untick();          // => check_fooを非選択状態に
$('input[type=checkbox]').untick();           // => 全チェックボックスを非選択状態に
$('input[name=radio_bar][value=2]').untick(); // => radio_barのvalueが2のラジオボタンを非選択状態に
$('input[type=radio]').untick();              // => 全ラジオボタンを非選択状態に
```

### $(_link-element_ or _image-element_).url([ filter, src-attr ])

`a`要素の`href`、`img`要素の`src`、`script`要素の`src`、もしくは`link`要素の`href`のURLを完全な形(絶対パス)にしたものを取得します。元から完全なURLになっている場合(外部リンクなど)や`javascript:void(0)`といったURLでないリンクはその内容をそのまま返します。

```html
<a id="top" href="../index.html">トップページ</a>
```

`http://foo.bar.baz/hoge/`というページ内に上記のようなリンクがある場合、`$(...).attr('href')`と`$(...).url()`の戻り値はそれぞれ以下のようになります。

```js
console.log($('a#top').attr('href')); // => '../index.html'
console.log($('a#top').url());        // => 'http://foo.bar.baz/index.html'
```

また、対象の要素が複数ある場合は各要素の絶対URLを配列に格納して返します。

```js
console.log($('a').url());
// => [
//      'http://foo.bar.baz/index.html',
//      'http://foo.bar.baz/xxx.html',
//      'https://www.google.com/'
//    ]
```

#### filter

第1引数の`filter`は、対象要素の`href`や`src`のURLを3種類に分類して、取得対象から除外するかどうかフィルタリングするオプションです。

1. `relative` ... 相対URL(サイト内リンク)
2. `absolute` ... 絶対URL(http(s)から始まるリンク(主にサイト外リンク))
3. `invalid` ... URL以外(JavaScriptなど)

> サイト内リンクを絶対URLで指定しているページもあるので、絶対URL = サイト外リンクとは限りません。

各フィルタを`true`にすると取得、`false`にすると除外という意味になります。デフォルトはすべて`true`になっています。

##### 例

```html
<a href="./page2.html">
<a href="./#foo">
<a href="javascript:hogehoge();">
<a href="http://www.yahoo.com/">
```

このようなHTMLに対して`$('a').url()`を各種`filter`オプション指定で実行した時の戻り値は以下のようになります。

```js
// 指定無し
console.log($('a').url();
// => [
//      'http://foo.bar.baz/page2.html',
//      'http://foo.bar.baz/#foo',
//      'javascript:hogehoge();',
//      'https://www.yahoo.com/'
//    ]

// 相対リンクのみ取得
console.log($('a').url({
  relative: true,
  absolute: false,
  invalid: false
}));
// => [
//      'http://foo.bar.baz/page2.html',
//      'http://foo.bar.baz/#foo'
//    ]

// URLとして有効なもののみ取得(除外するものだけfalseの指定でもOK)
console.log($('a').url({ invalid: false }));
// => [
//      'http://foo.bar.baz/page2.html',
//      'http://foo.bar.baz/#foo',
//      'https://www.yahoo.com/'
//    ]

```

なお、対象となる要素が1つのみの時の戻り値は配列ではなく絶対URLの文字列になりますが、その際の`filter`オプションの指定とその結果は以下のようになります。

```html
<a id="top" href="index.html">Ajax</a>
```

上記リンクは相対リンクなので分類としては`relative`に入ります。この時`relative`を除外するオプションで`url()`を呼び出すと戻り値は`undefined`となります。

```js
console.log($('#top').url({ relative: false })); // => undefined
```

#### src-attr

第2引数の`src-attr`は、`img`要素から画像URLとして取得する属性名を指定するオプションです(文字列 or 配列)。

取得対象のWEBページでLazyLoad系のjQueryプラグインなどを使っている場合は`src`属性にダミーの画像URLが入っていたりしますが、そのような`img`要素で`src`属性以外からURLを取得する際に指定します。

```html
<img src="blank.gif" data-original-src="http://this.is/real-image.png">
```

このようなHTMLで、`src`の`blank.gif`ではなく`data-original-src`の`http://this.is/real-image.png`を取得したい場合は以下のように指定します。

```js
// filterオプションは省略可能
$('img').url('data-original-src');
```

`data-original-src`がその要素に存在しない場合は`src`属性のURLを取得します。

なお、デフォルトでは`data-original`>`data-lazy-src`>`data-src`>`src`の優先順になっています。デフォルトの優先順位を破棄して`src`属性の画像を最優先で取得したい場合は、

```js
$('img').url({ invalid: false }, []);
```

のように空配列を指定します。

### $(_image-element_).download([ src-attr ])

拡張cheerioオブジェクトからダウンロードマネージャーへの登録を行います。`<img src="data:image/png;base64,/9j/4AAQSkZJRgABA ...">`といった埋め込み画像もバイナリ化してダウンロードできます。

現在対応しているのは`img`要素だけなので、`img`要素以外で`download()`を実行すると例外が発生します。

また、`download()`を実行する際にはダウンロードマネージャーの設定が必要になります。

##### 例

```js
var fs = require('fs');
var client = require('cheerio-httpcli');

// ①ダウンロードマネージャーの設定(全ダウンロードイベントがここで処理される)
client.download
.on('ready', function (stream) {
  stream.pipe(fs.createWriteStream('/path/to/image.png'));
  console.log(stream.url.href + 'をダウンロードしました');
})
.on('error', function (err) {
  console.error(err.url + 'をダウンロードできませんでした: ' + err.message);
})
.on('end', function () {
  console.log('ダウンロードが完了しました');
});

// ④並列ダウンロード制限の設定
client.download.parallel = 4;

// ②スクレイピング開始
client.fetch('http://foo.bar.baz/', function (err, $, res, body) {
  // ③class="thumbnail"の画像を全部ダウンロード
  $('img.thumbnail').download();
  console.log('OK!');
});
```

①の`client.download`というのがcheerio-httpcliに内蔵されているダウンロードマネージャーになります。

スクレイピング中に`$(...).download()`メソッドで実行された画像のダウンロードが始まると`client.download`の`ready`イベントが発生します(エラーが発生した場合は`error`イベント)。

`end`イベントはダウンロード待ちのURLがなくなった時に発生します。

①では色々な場所から実行される画像ダウンロード時の共通処理を設定しています。この例では引数に渡されたダウンロード元画像ファイルのStreamを`/path/to/image.png`に保存しています。

`client.download`のイベント処理設定が完了したら②スクレイピングに入ります。

②でWEBページを取得し、その中の③で`$(...).download()`メソッドを実行しています。

この時、`$('img.thumbnail')`に該当する画像要素が10個あったとすると、その10個の画像要素がまとめてダウンロードマネージャーに登録されます(すでに登録済みのURLは除外されます)。

少し戻って④を見ると並列ダウンロード数制限が設定されています。今回の例では`4`なので、登録された10個の画像要素の内、即座に4つがダウンロード処理に入ります。

残りの6要素はダウンロード待ちキューに入り、最初の4つの内のどこかのダウンロードが完了して空きができると、次の画像URLがその空き部分にに登録されてダウンロードが実行される ... という流れです。

> 画像ダウンロードは本線である②③のスクレイピングとは非同期で行われます。
>
> 上記の例では③を実行して「OK!」が表示された段階で本線のスクレイピングは終わりますが、画像のダウンロードはまだ途中であり、また、ダウンロードマネージャーに登録した全画像のダウンロードが完了するまではこのスクリプト自体は終了しません。
>
> 「OK!」が表示されてもなかなかコンソールに制御が戻ってこないからといって`Ctrl+C`とかはせずに、ダウンロード完了までお待ちください。

#### src-attr

第1引数の`src-attr`オプションは、`url()`と同様に`img`要素から画像URLとして取得する属性名を指定可能です(文字列 or 配列)。

```html
<img src="blank.gif" data-original-src="http://this.is/real-image.png">
```

上記のようなHTMLで、`src`の`blank.gif`ではなく`data-original-src`の`http://this.is/real-image.png`をダウンロードしたい場合は以下のように指定します。

```js
$('img').download('data-original-src');
```

> その他仕様は`url()`の`src-attr`項を参照

#### ダウンロードマネージャー

`$(...).download()`で登録されたURLのダウンロード時共通設定になります。

##### プロパティ

###### parallel

ダウンロードの同時並列実行数を指定します。`1`～`5`の間で指定します(デフォルトは`3`)。すでにダウンロードが始まっている段階で値を変更した場合は、現在実行中のダウンロードがすべて完了してから反映されます。

###### state

ダウンロードマネージャーの現在の処理状況を確認できます。読み取り専用なので数値を変更してもダウンロードの状況は変化しません。

`state`には以下の2項目が登録されています。

* `queue` ... ダウンロード待ち件数
* `complete` ... ダウンロード完了件数
* `error` ... エラー件数

```js
console.log(client.download.state); // => { queue: 10, complete: 3, error: 0 }
```

また、ダウンロードイベント内で`this.state`でも確認できます。

```js
client.download
.on('ready', function (stream) {
  console.log(this.state); // => { queue: 2, complete: 5, error: 1 }
  ...
```

##### メソッド

###### clearCache()

ダウンロードマネージャーは重複したURLを除外するためにURLキャッシュを内部で持っています。何らかの理由でそのキャッシュをクリアする場合に使用します。

##### イベント

`download.on`で設定可能はイベントは以下の通りです。

###### on('ready', funciton (stream) { ... })

ダウンロード開始時に発生するイベント時の処理です。URL毎に発生します。引数の`stream`にはダウンロード元画像ファイルのストリームが入ります。`stream`に実装されているプロパティ/メソッドは以下のとおりです。

* `url` ... 画像ファイルのURLオブジェクトです。URLの文字列は`stream.url.href`で取得できます。Base64埋め込み画像の場合はURLオブジェクトではなく`base64`という文字列が入ります。
* `type` ... Content-Typeが入ります。サーバーから返されたレスポンスヘッダにContent-Typeがない場合は`undefined`になります。
* `length` ... Content-Lengthが入ります。サーバーから返されたレスポンスヘッダにContent-Lengthがない場合は`-1`になります。
* `toBuffer(callback)` ... ストリームをBufferに変換してコールバック関数(err, buffer)に返します。画像ファイルの内容をすべてメモリ上に読み込むので巨大な画像の場合はそれだけメモリを消費します。
* `end()` ... ストリームの読み込みを終了します。`ready`イベント内で__ストリームを読み込まずに処理を抜ける場合などは必ず呼び出してください__(そのままにしておくとキューが詰まって次のダウンロードができなくなることがあります。また、ストリームが読み込まれずに放置されたまま`timeout`時間が経過すると`error`イベントが発生して強制的にエラー扱いとなります)。

###### on('error', funciton (err) { ... })

ダウンロード中にエラーが発生した時に発生するイベント時の処理です。引数の`err`オブジェクトには`url`プロパティ(ダウンロード元の画像URL)が入っています。

###### on('end', funciton () { ... })

ダウンロード待ちキューが空になった時に発生するイベント時の処理です。引数はありません。

###### 例

```js
client.download
.on('ready', function (stream) {
  // gif画像以外はいらない
  if (! /\.gif$/i.test(stream.url.pathname)) {
    return stream.end();
  }

  // 各種情報表示
  console.log(stream.url.href); // => 'http://hogehoge.com/foobar.png'
  console.log(stream.type);     // => 'image/png'
  console.log(stream.length);   // => 10240

  // Buffer化してファイルに保存
  stream.toBuffer(function (err, buffer) {
    fs.writeFileSync('foobar.png', buffer, 'binary');
  });
})
.on('error', function (err) {
  console.error(err.url + ': ' + err.message);
})
.on('end', function (err) {
  console.log('queue is empty');
});

```


### $(_element_).entityHtml()

対象要素のHTML部分をすべてHTMLエンティティ化した文字列を返します。基本的には使い道はないと思います。

```js
// <h1>こんにちは</h1>
console.log($('h1').html())        // => 'こんにちは'
console.log($('h1').entityHtml()); // => '&#x3053;&#x3093;&#x306B;&#x3061;&#x306F;'
```

## Tips

### responseオブジェクトの独自拡張

`fetch()`、`cheerio.click()`、`cheerio.submit()`などで取得できる`response`オブジェクトはrequestモジュールで取得したものですが、独自拡張として`cookies`プロパティを付け足しています。

```js
client.fetch('http://hogehoge/')
.then(function (result) {
  // プロミス形式でログインフォーム送信
  return result.$('form[name=login]').submit({ user: 'hoge', pass: 'fuga' })
})
.then(function (result) {
  // ログイン後のクッキー内容確認
  console.log(result.response.cookies);
});
```

この`cookies`プロパティには現在取得したページのサーバーから送られてきたクッキーのキーと値が連想配列で入っています。セッションIDやログイン状態の確認などに使えるかもしれません。

なお、この`cookies`の値を変更してもリクエスト処理には反映されません。クッキー確認専用のプロパティです。

### Basic認証

Basic認証が必要なページには以下の二通りの方法でアクセスできます。

#### リクエストヘッダに認証情報をセット

```js
var client = require('cheerio-httpcli');
var user = 'hoge';
var password = 'foobarbaz';

client.set('headers', {
  Authorization: 'Basic ' + new Buffer(user + ':' + password).toString('base64')
});
client.fetch('http://securet.example.com', function (err, $, res, body) {
  .
  .
  .
  // 不要になったら消去(これを忘れるとその後別のページにアクセスするときにも認証情報を送信してしまう)
  delete(client.headers['Authorization']);
});
```

#### URLに認証情報をセット

```js
var client = require('cheerio-httpcli');
var user = 'hoge';
var password = 'foobarbaz';

client.fetch('http://' + user + ':' + password + '@securet.example.com', function (err, $, res, body) {
```

詳細は[こちら](http://qiita.com/ktty1220/items/e9e42247ede476d04ce2#comment-02b5b12c8be4f193834b)

### プロキシサーバー経由でアクセス

環境変数`HTTP_PROXY`に`http://プロキシサーバーのアドレス:ポート/`をセットするとプロキシサーバー経由でWEBページを取得します。

```js
process.env.HTTP_PROXY = 'http://proxy.hoge.com:18080/';  // プロキシサーバーを指定

var client = require('cheerio-httpcli');
client.fetch('http://foo.bar.baz/', ...
```

### 今まで接続できていたhttpsのページに接続できなくなった場合

`0.7.2`からhttps接続方法に関する仕様に若干変更があり、その影響で今まで接続できていたページに接続できないというケースが発生するかもしれません。

`0.7.1`までと同じ挙動にする場合は以下のように設定してください。

```js
var client = require('cheerio-httpcli');
var constants = require('constants');  // <- constantsモジュールを別途インストール

client.set('agentOptions', {
  secureOptions: constants.SSL_OP_NO_TLSv1_2
});
```

### httpsページ接続時の「unable to verify the first certificate」エラー

cheerio-httpcliでアクセスしたサーバー側のSSL証明書設定に不備があると発生することがあります。

基本的にはサーバー側で対応してもらわないと接続はできないのですが、スクリプトの最初の方に以下の指定をするとSSL証明書検証でエラーが発生しても無理やり処理を続行してアクセスすることが可能です。

```js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;  // SSL証明書検証エラーを無視する設定

var client = require('cheerio-httpcli');
```

ただし、この方法は安全でないサイトにアクセスできるという危険な指定なので、あくまでも緊急時においてのみ自己責任で設定するようにしてください。

### XMLの名前空間付きタグの指定方法

```xml
<dc:title>タイトル</dc:title>
```

このようなXMLタグは

```js
$('dc:title').text();
```

では取得できません。

```js
$('dc\\:title').text();
```

といった具合にコロンを「\\」でエスケープすることで取得することができます。

### Electronに組み込む

いろいろと工夫するとwebpackで固められますが、それでも`Sync`系メソッドは正常に動作しません(利用不可)。また、webpackの際に大量のwarningが発生するので、その他の機能に関しても正常に動作するかは分かりません。詳細は[こちら](https://github.com/ktty1220/cheerio-httpcli/issues/14#issuecomment-230733142)をご覧ください。

ご利用の際は自己責任でお願いします。

また、Electronという環境に起因する動作不良に関しては、ちょっとした修正で解決するものは対応しますが、現行の仕組みを大きく変える必要がある場合は対応しない事もあります。ご了承ください。

### TypeScriptからの利用

@typesではなくcheerio-httpcli本体に定義ファイルが同梱されています。

```ts
import * as client from 'cheerio-httpcli';

client.fetch('http://foo.bar.baz/', (err, $, res, body) => {
  ...
```

といった形でTypeScriptから利用できます。

### 文字コード判別の仕様

文字コードの判別はjschardetで高精度で判別できた場合はその情報を使用しますが、そうでない場合は`<head>`タグのcharset情報を参照します。後者での判別時においてcharsetで指定された文字コードとWEBページの実際の文字コードが異なる場合は変換エラーや文字化けが発生します。

## ライセンス

[MIT license](http://www.opensource.org/licenses/mit-license)で配布します。

&copy; 2013-2018 [ktty1220](mailto:ktty1220@gmail.com)

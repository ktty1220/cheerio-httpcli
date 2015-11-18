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

1. 取得先WEBページの文字コードを自動で判定してHTMLをUTF-8に変換してくれる
2. UTF-8に変換したHTMLをjQueryのように操作することが可能
3. Node.jsお馴染みのコールバック形式と最近の流行であるプロミス形式どちらにも対応
4. フォームの送信やリンクのクリックをエミュレート
5. ブラウザ指定による簡単User-Agent切り替え機能
6. 現在のクッキーの内容を簡単に取得できる(読み取り専用)

> 静的なHTMLをベースに処理するモジュールなのでSPAなどクライアントサイドのJavaScriptによってコンテンツを取得/変更するタイプのWEBページには対応していません。

## インストール

```sh
npm install cheerio-httpcli
```

## メソッド

### fetch(url[, get-param, callback])

`url`で指定したWEBページをGETメソッドで取得し、文字コードの変換とHTMLパースを行い`callback`関数に返します。

`callback`関数には以下の4つの引数が渡されます。

1. Errorオブジェクト
2. `cheerio.load()`でHTMLコンテンツをパースしたオブジェクト(独自拡張版)
3. requestモジュールの`response`オブジェクト(独自拡張版)
4. UTF-8に変換したHTMLコンテンツ

GET時にパラメータを付加する場合は第2引数の`get-param`に連想配列で指定します。

##### サンプル

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

#### プロミス形式での呼び出し

`fetch()`の第3引数である`callback`関数を省略すると、戻り値としてPromiseオブジェクトが返ります。先ほどのサンプルをプロミス形式で呼び出すと以下のようになります。

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
  console.log(result); => {
                            error: ...,
                            $: ...,
                            response: ...,
                            body: ...
                          };
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

> `fetch()`の第3引数の`callback`関数を指定した場合はPromiseオブジェクトは返しません。したがってコールバック形式で呼び出しつつPromiseオブジェクトで何かをするということはできません。

### setBrowser(browser-type)

ブラウザごとのUser-Agentをワンタッチで設定するメソッドです。

```js
var client = require('cheerio-httpcli');

client.setBrowser('chrome');    // GoogleChromeのUser-Agentに変更
client.setBrowser('android');   // AndroidのUser-Agentに変更
client.setBrowser('googlebot'); // GooglebotのUser-Agentに変更
```

User-Agentを指定したブラウザのものに変更した場合は`true`、対応していないブラウザを指定するとUser-Agentは変更されずに`false`が返ります。

対応しているブラウザは以下のとおりです。

* ie
* edge
* chrome `default`
* firefox
* opera
* vivaldi
* safari
* ios
* android
* googlebot

なお、細かいバージョンの指定まではできないので、そういった指定も行いたい場合は手動で以下のようにUser-Agentを指定してください。

```js
// IE6のUser-Agentを手動で指定
client.headers['User-Agent'] = 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)';
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

`iconv-module-name`には使用するiconv系モジュール名(`'iconv'`, `'iconv-lite'`, `'iconv-jp'`)のいずれかの文字列を指定します。

##### サンプル

```js
var client = require('cheerio-httpcli');

// あえてiconv-liteを使用
client.setIconvEngine('iconv-lite');
client.fetch( ...
```

## プロパティ

### version

cheerio-httpcliのバージョン情報です。

### headers

requestモジュールで使用するリクエストヘッダ情報の連想配列です。デフォルトでは何も指定されていませんが、`fetch()`実行時にUser-Agentが空の場合は自動的にUser-AgentにIE11の情報が入ります。

### timeout

requestモジュールで指定するタイムアウト情報です。デフォルトでは30秒となっています(効いているかどうか不明)。

### gzip

サーバーとの通信にgzip転送を使用するかどうかを真偽値で指定します。デフォルトは`true`(gzip転送する)です。

### referer

リファラーを自動でセットするかどうかの指定です。`true`にすると1つ前に`fetch()`したページのURLが自動でリクエストヘッダのRefererにセットされます。デフォルトは`true`です。

### maxDataSize

`fetch()`などで受信するデータの限界量を数値(バイト数)で指定します。この値を超えるサイズを受信した段階でエラーが発生します。ユーザーから入力されたURLを解析する用途などにおいて、不用意に大きいデータを読み込んでしまい回線を占有する可能性がある場合に指定しておいた方が良いでしょう。

デフォルトは`null`(制限なし)です。

```js
var client = require('cheerio-httpcli');

// 受信料制限を1MBに指定
client.maxDataSize = 1024 * 1024;

// 1MB以上ののHTMLを指定
client.fetch('http://big.large.huge/data.html', function (err, $, res, body) {
  console.log(err.message);  // => 'data size limit over'
});
```

なお、maxDataSizeを超えた場合は途中まで受信したデータは破棄されます。

### debug

`true`にするとリクエストの度にデバッグ情報を出力します(`stderr`)。デフォルトは`false`です。

```js
var client = require('cheerio-httpcli');

// デバッグ表示ON
client.debug = true;
client.fetch( ...
```

## cheerioオブジェクトの独自拡張

cheerio-httpcliではcheerioオブジェクトのprototypeを拡張していくつかの便利メソッドを実装しています。

### $.documentInfo()

取得したWEBページに関する情報(URLとエンコーディング)を取得できます。

```js
client.fetch('http://hogehoge/', function (err, $, res, body) {
  var docInfo = $.documentInfo();
  console.log(docInfo.url);      // http://hogehoge/
  console.log(docInfo.encoding); // 'utf-8'
});
```

`fetch()`で指定したURLがリダイレクトされた場合はリダイレクト先のURLが`url`に入ります。`encoding`に関しても同様で、最終的に到達したページのエンコーディングが入ります。

### $(link-element).click([ callback ])

`a`タグでのみ使用できます。

`href`属性に指定されているURLと取得したページのURLを組み合わせて移動先のURLを作成し、`fetch()`を実行します。`fetch()`と同様に引数の`callback`関数の有無でコールバック形式とプロミス形式の指定を切り替えられます。

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

なお、`$(...)`で取得した`a`タグオブジェクトが複数ある場合は先頭のオブジェクトに対してのみ実行されます。

### $(form-element).submit([ param, callback ])

`form`タグでのみ使用できます。

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

cheerio-httpcliは内部でクッキーも保持するので、ログインが必要なページの取得なども`submit()`でログイン後に巡回できるようになります。

その他の仕様は`click()`と同様です。

* `onsubmit="xxx"`や送信ボタンの`onclick="..."`で実行される動的処理には対応していません。
* `$(...)`で取得した`form`タグオブジェクトが複数ある場合は先頭のオブジェクトに対してのみ実行されます。

### $(element).text([ string ]) / $(element).html([ string ])

cheerioデフォルトの`text()`および`html()`は、元からHTMLエンティティで表記している文字列をそのまま返します。

```html
<span id="hello">&lt;hello&gt;</span>
```

上記のようなHTMLの場合、以下のようになります。

```js
console.log($('#hello').text());
// => &lt;hello&gt;
```

cheerio-httpcliではこの挙動を変更し、元からHTMLエンティティで表記されている文字列も可読文字にデコードします。数値参照、16進数参照、文字参照すべて変換します。

```js
console.log($('#hello').text());
// => <hello>
```

もし、HTMLエンティティを変換しない元の表記のままのテキストやHTMLを取得したい場合は`_text()`および`_html()`メソッドを使用してください。こちらはcheerioデフォルトの挙動となります。

```js
console.log($('#hello').text());
// => <hello>
console.log($('#hello')._text());
// => &lt;hello&gt;
```

## responseオブジェクトの独自拡張

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

## Tips

### Basic認証

Basic認証が必要なページには以下の二通りの方法でアクセスできます。

#### リクエストヘッダに認証情報をセット

```js
var client = require('cheerio-httpcli');
var user = 'hoge';
var password = 'foobarbaz';

client.headers['Authorization'] = 'Basic ' + new Buffer(user + ':' + password).toString('base64');
client.fetch('http://securet.example.com', function (err, $, res, body) {
  .
  .
  .
  // 不要になったら消去
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

## その他

* 文字コードの判別はjschardetで高精度で判別できた場合はその情報を使用しますが、そうでない場合は`<head>`タグのcharset情報を参照します。後者での判別時においてcharsetで指定された文字コードとWEBページの実際の文字コードが異なる場合は変換エラーや文字化けが発生します。

## ライセンス

[MIT license](http://www.opensource.org/licenses/mit-license)で配布します。

&copy; 2013-2015 [ktty1220](mailto:ktty1220@gmail.com)

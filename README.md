# cheerio-httpcli

#### iconv系モジュールによる文字コード変換とcheerioによるHTMLパースを組み込んだNode.js用HTTPクライアントモジュール

Node.jsでWEBページのスクレイピングを行う際に必要となる文字コードの変換とHTMLのパースを行った後のオブジェクトを取得できるHTTPクライアントモジュールです。

実装にあたり、以下のモジュールを利用しています。

* WEBページの取得: [request](https://npmjs.org/package/request)
* WEBページの文字コード判定: [jschardet](https://github.com/aadsm/jschardet)
* 文字コードの変換: [iconv-lite](https://github.com/ashtuchkin/iconv-lite)
* HTMLのパース: [cheerio](https://npmjs.org/package/cheerio)

※ cheerioはHTMLをjQueryライクにパースしてくれるモジュールです。パース後のオブジェクトを格納する変数名を「$」にすると、`$('title').text()`のようなjQueryそのままの形で要素の情報を取得できます。

## インストール

    npm install cheerio-httpcli

## メソッド

### fetch(url[, get-param], callback)

`url`で指定したWEBページをGETメソッドで取得し、文字コードの変換とHTMLパースを行い`callback`に返します。

`callback`には以下の3つの引数が渡されます。

1. Errorオブジェクト
2. `cheerio.load()`でHTMLコンテンツをパースしたオブジェクト
3. requestモジュールの`response`オブジェクト

GET時にパラメータを付加する場合は、`get-param`に連想配列で指定します。

#### サンプル

```
var client = require('cheerio-httpcli');

// Googleで「node.js」について検索する。
client.fetch('http://www.google.com/search', { q: 'node.js' }, function (err, $, res) {
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

同梱の「example.js」はGoogle検索結果の一覧を取得するサンプルです。参考にしてください。

### setIconvEngine(iconv-module-name)

cheerio-httpcliは、実行時にインストールされているiconv系のモジュールをチェックして利用するモジュールを自動的に決定しています。優先順位は以下のとおりです。

1. iconv-jp
2. iconv
3. iconv-lite

iconv-liteはcheerio-httpcliのインストール時に依存モジュールとして一緒にインストールされますが、ネイティブモジュールであるiconv-jpやiconvがインストールされている場合、処理速度や対応文字コードの多さというメリットがあるそちらを優先してロードするようになっています。

このメソッドは自動的にロードされたiconv系モジュールを破棄して、使用するiconv系モジュールを手動で指定するためのものです。モジュールテスト時の切り替え用メソッドなので基本的には実用性はありません。

`iconv-module-name`には使用するiconv系モジュール名(`'iconv-jp'`, `'iconv'`, `'iconv-lite'`)のいずれかの文字列を指定します。

#### サンプル

```
var client = require('cheerio-httpcli');

// あえてiconv-liteを使用
client.setIconvEngine('iconv-lite');
client.fetch( ...
```

## プロパティ

### headers

requestモジュールで使用するリクエストヘッダ情報の連想配列です。デフォルトでは`User-Agent`のみIE11の情報を指定しています。

### timeout

requestモジュールで指定するタイムアウト情報です。デフォルトでは30秒となっています。

### gzip

サーバーとの通信にgzip転送を使用するかどうかを真偽値で指定します。デフォルトは`true`(gzip転送する)です。

## その他

* 文字コードの判別はjschardetで高精度で判別できた場合はその情報を使用しますが、そうでない場合は`<head>`タグのcharset情報を参照します。後者での判別時においてcharsetで指定された文字コードとWEBページの実際の文字コードが異なる場合は変換エラーや文字化けが発生します。

## Changelog

### 0.2.0 (2014-06-22)

* デフォルトでiconv-liteを使用するように変更(ネイティブモジュールをコンパイルするためのVisualStudioなどの開発環境のないWindowsでもインストールできるようになった)
* 文字コードの判別にjschardetを利用するようにした
* requestモジュールのクッキーを有効にした
* デフォルトのUser-Agent情報をIE11にした

### 0.1.3 (2013-09-09)

* エラーオブジェクトに呼び出し時にセットした`param`を追加

### 0.1.2 (2013-09-06)

* リクエストヘッダのHostを自動でセットするようにした
* gzip転送オプション追加
* `fetch()`のcallbackの第3引数にrequestモジュールの`response`オブジェクトを追加
* HTTPステータスコードが200以外によるエラーでもコンテンツを取得するようにした

### 0.1.1 (2013-04-11)

* charset=xxxというようにダブル(or シングル)クォーテーションがない場合に文字コードの判定に失敗するケースを修正

### 0.1.0 (2013-03-18)

* 初版リリース

## ライセンス

[MIT license](http://www.opensource.org/licenses/mit-license)で配布します。

&copy; 2013 [ktty1220](mailto:ktty1220@gmail.com)

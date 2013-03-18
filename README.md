# cheerio-httpcli - iconvによる文字コード変換とcheerioによるHTMLパースを組み込んだNode.js用HTTPクライアントモジュール

Node.jsでWEBページのスクレイピングを行う際に必要となる文字コードの変換とHTMLのパースを行った後のオブジェクトを取得できるHTTPクライアントモジュールです。

WEBページの取得には[request](https://npmjs.org/package/request)、文字コードの変換には[iconv](https://npmjs.org/package/iconv)、HTMLのパースには[cheerio](https://npmjs.org/package/cheerio)を使用しています。

cheerioはHTMLをjQueryライクにパースしてくれるモジュールです。パース後のオブジェクトを格納する変数名を「$」にすると、`$('title').text()`のようなjQueryそのままの形で要素の情報を取得できます。

## インストール

    npm install cheerio-httpcli

## メソッド

### fetch(url[, get-param], callback)

`url`で指定したWEBページをGETメソッドで取得し、文字コードの変換とHTMLパースを行いcallbackに返します。

`callback`の引数は、(Errorオブジェクト, `cheerio.load()`の戻り値)です。

GET時にパラメータを付加する場合は、`get-param`に連想配列で指定します。

#### サンプル

    var client = require('cheerio-httpcli');

    // Googleで「node.js」について検索する。
    client.fetch('http://www.google.com/search', { q: 'node.js' }, function (err, $) {
      // HTMLタイトルを表示
      console.log($('title').text());
       ・
       ・
       ・
    });

Google検索結果の一覧を取得する方法は「example.js」を参照してください。

## プロパティ

### headers

`request`で使用するリクエストヘッダ情報の連想配列です。デフォルトでは`User-Agent`のみIE9の情報を指定しています。

### timeout

`request`で指定するタイムアウト情報です。デフォルトでは30秒となっています。

## その他

* 文字コードの判別は`<head>`タグのcharset情報を参照しています。charsetで指定された文字コードとWEBページの実際の文字コードが異なる場合は変換エラーとなります。
* iconv-jpがインストールされていればそちらを優先して使用します。

## Changelog

### 0.1.0 (2013-03-18)

* 初版リリース

## ライセンス

[MIT license](http://www.opensource.org/licenses/mit-license)で配布します。

&copy; 2013 [ktty1220](mailto:ktty1220@gmail.com)

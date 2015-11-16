/*eslint no-invalid-this:0*/
'use strict';

var urlParser = require('url');
var cutil     = require('./util');

module.exports = function (encoding, client, cheerio) {
  /**
   * a要素のリンク/submit系ボタンのクリックをエミュレート
   *
   * a要素: リンク先のページを取得
   * submit系ボタン: 所属フォームのsubmit
   *
   * @param callback リクエスト完了時のコールバック関数(err, response, body(buffer))
   */
  cheerio.prototype.click = function (callback) {
    var doc = cutil.documentInfo(this);
    var $ = cheerio;
    var $link = null;

    // a要素でなければエラー
    try {
      if (this.length === 0) {
        throw new Error('no elements');
      }

      // 複数ある場合は先頭の要素のみ
      $link = this.eq(0);
      // submit系要素の場合はsubmit()に飛ばす
      var type = $link.attr('type');
      var is = {
        a: $link.is('a'),
        input: $link.is('input'),
        button: $link.is('button')
      };
      if ((is.input || is.button) && [ 'submit', 'image' ].indexOf(type) !== -1) {
        var $form = $link.closest('form');
        var param = {};
        var name = cutil.paramFilter($link.attr('name'));
        if (name.length > 0) {
          if (type === 'submit') {
            // submit: 押したボタンのnameとvalueを送信する
            param[name] = $link.val() || $link.attr('value');
          } else {
            // image: 押したボタンのname.xとname.y座標を送信する(ダミーなので0)
            param[name + '.x'] = 0;
            param[name + '.y'] = 0;
          }
        }
        return $form.submit(param, callback);
      }
      // submit系要素でもa要素でもなければエラー
      if (! is.a) {
        throw new Error('element is not clickable');
      }
    } catch (e) {
      return client.error(e.message, {
        param: { uri: doc.url },
        callback: callback
      });
    }

    var url = urlParser.resolve(doc.url, $link.attr('href'));
    return client.run('GET', url, callback);
  };
};

/*eslint no-invalid-this:0*/
'use strict';

var typeOf = require('type-of');
var each   = require('foreach');
var cutil  = require('./util');

module.exports = function (encoding, client, cheerio) {
  /**
   * フォーム内部品の値取得/設定
   *
   * jQueryの$().attrや$().cssと同じ使用感
   * 1. nameのみ指定した場合はそのname部品の値を取得
   * 2. name, valueを指定した場合はそのname部品の値をvalueに設定
   * 3. valueに関数を指定した場合はその関数の戻り値をname部品の値に設定
   * 4. nameに文字列でなくname:valueの連想配列を指定した場合は複数要素をまとめて設定
   *
   * @param name       対象のフォーム部品のname or name: valueの連想配列
   * @param value      設定する値 or 値を返す関数 or undefined
   * @param onNotFound 指定したnameの要素が見つからない場合の挙動('throw', 'append')
   * @return 1: name部品の値 or 2-4: this(メソッドチェーン用)
   */
  cheerio.prototype.field = function (name, value, onNotFound) {
    var doc = cutil.documentInfo(this);
    var $ = cheerio;
    var $form = null;

    // form要素でなければエラー
    if (this.length === 0) {
      throw new Error('no elements');
    }

    // 複数ある場合は先頭のフォームのみ
    $form = this.eq(0);
    if (! $form.is('form')) {
      throw new Error('element is not form');
    }

    // 引数未指定の場合はそのフォーム内の全要素のname:valueを連想配列で返す
    if (arguments.length === 0) {
      // cheerio.serializeArray()だと値のない部品を拾ってくれないようなので自力で
      var fieldParams = {};
      var fieldCounts = {};
      var forceSingle = [];
      var forceMulti = [];
      $form.find('input,textarea,select').each(function (idx) {
        var $e = $(this);
        var name = $e.attr('name');
        var type = ($e.attr('type') || '').toLowerCase();
        var val = $e.val() || $e.attr('value');
        if (! name) {
          return;
        }
        // submit系要素はjavascriptでform.submit()した時にはパラメータとして付加しない
        // (ブラウザと同じ挙動)
        if (cutil.inArray([ 'submit', 'image' ], type)) {
          return;
        }
        fieldCounts[name] = (fieldCounts[name] || 0) + 1;
        fieldParams[name] = fieldParams[name] || [];

        // radioは複数同nameがあるのが普通なので設定値を配列にしない
        if (type === 'radio' && ! cutil.inArray(forceSingle, name)) {
          forceSingle.push(name);
        }
        // selectでmultipleの場合は強制的に設定値を配列にする
        if ($e.is('select') && $e.attr('multiple') && ! cutil.inArray(forceMulti, name)) {
          forceMulti.push(name);
        }

        if (cutil.inArray([ 'checkbox', 'radio' ], type) && ! $e.attr('checked')) {
          return;
        }
        if (typeOf(val) === 'array') {
          fieldParams[name] = fieldParams[name].concat(val);
        } else {
          fieldParams[name].push(cutil.paramFilter(val));
        }
      });
      // 複数同nameのcheckboxやmultipleのselect以外は値の配列化を解除
      each(fieldCounts, function (count, name) {
        if (cutil.inArray(forceMulti, name)) {
          return;
        }
        if (cutil.inArray(forceSingle, name) || count === 1) {
          fieldParams[name] = fieldParams[name].shift();
        }
      });
      return fieldParams;
    }

    // 値の取得のみ
    if (typeOf(name) === 'string' && arguments.length === 1) {
      var $parts = $form.find('[name="' + name + '"]');
      return $parts.val() || $parts.attr('value');
    }

    var values = {};
    switch (typeOf(name)) {
      case 'string': {
        // name: valueの連想配列化してvaluesにセット
        values[name] = value;
        break;
      }
      case 'object': {
        // 連想配列で指定した場合はvalueの位置にonNotFoundが入っているのでずらす
        onNotFound = value;
        break;
      }
      default: {
        // それ以外の型は受け付けない
        throw new Error('name is not string or object');
      }
    }

    each(values, function (v, k, o) {
      var selector = [ 'input', 'textarea', 'select' ].map(function (s) {
        return s + '[name="' + k + '"]';
      }).join(',');
      var $parts = $form.find(selector);
      // TODO checkbox/radio: 一致するvalueを探す
      if ($parts.length === 0) {
        // nameに該当する部品が見つからない場合はonNotFoundに従う
        if (onNotFound === 'append') {
          // append: 新規にhidden要素を作成してフォームに付加
          // TODO 文字列: hidden, 配列: checkbox
          return $form.append(
            $('<input/>').attr({
              type: 'hidden',
              name: k,
              value: v
            })
          );
        }
        if (onNotFound === 'throw') {
          // throw: エラー
          throw new Error('Element named "' + k + '" could not be found in this form');
        }
      }
      // TODO checkbox/radio: tick/untick
      $parts.val((typeOf(value) === 'function') ? value() : value);
    });
  };

  return this;
};

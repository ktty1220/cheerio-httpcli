/*eslint no-invalid-this:0*/
/*jshint -W100*/

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

    // *** 値取得モード ***
    var argLen = arguments.length;
    var isGet = ((argLen === 0) || (typeOf(name) === 'string' && argLen === 1));
    if (isGet) {
      // cheerio.serializeArray()だと値のない部品を拾ってくれないようなので自力でやる
      var fieldInfo = {};
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
        fieldInfo[name] = fieldInfo[name] || {};
        fieldInfo[name].count = (fieldInfo[name].count || 0) + 1;
        fieldInfo[name].params = fieldInfo[name].params || [];

        // radioは複数同nameがあるのが普通なので設定値を配列にしない
        if (type === 'radio' && ! fieldInfo[name].force) {
          fieldInfo[name].force = 'single';
        }
        // selectでmultipleの場合は強制的に設定値を配列にする
        if ($e.is('select') && $e.attr('multiple') && ! fieldInfo[name].force) {
          fieldInfo[name].force = 'multi';
        }

        if (cutil.inArray([ 'checkbox', 'radio' ], type) && ! $e.attr('checked')) {
          return;
        }
        if (typeOf(val) === 'array') {
          fieldInfo[name].params = fieldInfo[name].params.concat(val);
        } else {
          fieldInfo[name].params.push(val);
        }
      });
      // 複数同nameのcheckboxやmultipleのselect以外は値の配列化を解除
      var fieldParams = {};
      each(fieldInfo, function (info, name) {
        fieldParams[name] = info.params;
        if (info.force !== 'multi' && (info.force === 'single' || info.count === 1)) {
          fieldParams[name] = fieldParams[name].shift();
        }
      });

      // 引数未指定の場合はそのフォーム内の全要素のname:valueを連想配列で返す
      return (argLen === 0) ? fieldParams : fieldParams[name];
    }

    // *** 値設定モード ***
    var values = {};
    switch (typeOf(name)) {
      case 'string': {
        // name: valueの連想配列化してvaluesにセット
        values[name] = value;
        break;
      }
      case 'object': {
        values = name;
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
      // valueが関数で指定されている場合は実行して値ベースにそろえる
      var realValue = (typeOf(v) === 'function') ? v() : v;

      // 同じnameで別部品とかあってもさすがにそれはフォーム側の問題な気がするので無視
      var selector = [ 'input', 'textarea', 'select' ].map(function (s) {
        return s + '[name="' + k + '"]';
      }).join(',');
      var $parts = $form.find(selector);
      var pType = $parts.attr('type');

      if ($parts.length === 0) {
        // nameに該当する部品が見つからない場合はonNotFoundに従う
        if (onNotFound === 'append') {
          // append: 新規に要素を作成してフォームに付加
          var iType = 'hidden';
          if (typeOf(realValue) === 'array') {
            // 値が配列: checkbox
            iType = 'checkbox';
          } else {
            // 値が文字列: hidden
            realValue = [ realValue ];
          }
          each(realValue, function (val) {
            var $input = $('<input/>').attr({ type: iType, name: k, value: val });
            if (iType === 'checkbox') {
              $input.attr('checked', 'checked');
            }
            $form.append($input);
          });
          return;
        }
        if (onNotFound === 'throw') {
          // throw: エラー
          throw new Error('Element named "' + k + '" could not be found in this form');
        }
      }

      if (cutil.inArray([ 'checkbox', 'radio' ], pType)) {
        // radioの場合は指定したvalueが該当しなければ何もしない
        if (pType === 'radio') {
          realValue = String(realValue);
          var partsValues = $parts.map(function (idx) {
            return $(this).val();
          }).get();
          if (! cutil.inArray(partsValues, realValue)) {
            return;
          }
        }

        // tick/untickで値を操作
        if (typeOf(realValue) !== 'array') {
          realValue = [ realValue ];
        }
        $parts.untick().each(function (idx) {
          if (cutil.inArray(realValue, $(this).val())) {
            $(this).tick();
          }
        });
        return;
      }

      $parts.val(realValue);
    });

    return this;
  };
};

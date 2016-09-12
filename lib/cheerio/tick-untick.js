/*eslint no-invalid-this:0*/
/*jshint -W100*/

'use strict';

var each  = require('foreach');
var cutil = require('./util');

module.exports = function (encoding, client, cheerio) {
  /**
   * チェックボックス/ラジオボタンの選択クリックをエミュレート
   *
   * @param elem    checked状態を変更するcheerio要素
   * @param checked 設定する値('checked' or undefined)
   */
  var emulateTick = function (elem, checked) {
    var $ = cheerio;

    if ($(elem).length === 0) {
      throw new Error('no elements');
    }

    // checkboxとradioの振り分け
    var $targets = {
      checkbox: [],
      radio: []
    };
    var radioGroups = [];
    $(elem).each(function (i) {
      var $e = $(this);
      var type = $e.attr('type');
      if (! $e.is('input') || ! cutil.inArray([ 'checkbox', 'radio' ], type)) {
        // input[type=checkbox/radio]以外が混じっていたらエラー
        throw new Error('element is not checkbox or radio');
      }
      // radio: 同グループで複数要素がtick対象となっている場合は先頭以外の要素は無視
      if (type === 'radio' && checked) {
        var name = $e.attr('name').toLowerCase();
        if (cutil.inArray(radioGroups, name)) {
          return;
        }
        radioGroups.push(name);
      }
      $targets[type].push($e);
    });

    // 振り分けたcheckboxとradioに対してそれぞれ選択状態の変更を行う
    each($targets, function ($elem, type) {
      if (type === 'radio' && checked) {
        // radioかつtickの場合はまず同グループの選択済みradioを全部未選択にする
        each($elem, function ($e) {
          var name = $e.attr('name');
          $e
          .closest('form')                                 // 所属するフォーム
          .find('input[type=radio][name="' + name + '"]')  // 同グループのradio
          .removeAttr('checked');                          // 選択状態
        });
      }

      each($elem, function ($e) {
        if (checked) {
          $e.attr('checked', checked);
        } else {
          $e.removeAttr('checked');
        }
      });
    });

    return elem;
  };

  /**
   * チェックボックス/ラジオボタンを選択状態にする
   */
  cheerio.prototype.tick = function () {
    return emulateTick(this, 'checked');
  };

  /**
   * チェックボックス/ラジオボタンの選択状態を解除する
   */
  cheerio.prototype.untick = function () {
    return emulateTick(this);
  };
};

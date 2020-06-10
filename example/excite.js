#!/usr/bin/env node

'use strict';

/**
 * excite翻訳サンプル
 *
 * 以下のstr変数の内容を翻訳します(言語自動判定)
 */
var str = 'お前はもう死んでいる';

var client = require('../index');

console.log('デバッグオプションを有効にします');
client.set('debug', true);

console.log('excite翻訳ページにアクセスします');
client
  .fetch('http://www.excite.co.jp/world/')
  .then(function (result) {
    return result.$('#formTrans').submit({
      auto_detect: 'on',
      before: str
    });
  })
  .then(function (result) {
    console.log('「' + str + '」=>「' + result.$('#after').val() + '」');
  })
  .catch(function (err) {
    console.error('エラーが発生しました', err);
  })
  .finally(function () {
    console.log('終了します');
  });

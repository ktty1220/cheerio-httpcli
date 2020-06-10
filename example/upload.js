#!/usr/bin/env node

'use strict';

/**
 * up300.netにファイルをアップロードするサンプル
 *
 * upfileにアップロードするファイルのパスを指定してください。
 *
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * !!! 注意: 本当にアップロードするので重要なファイルは指定しないでください !!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */
var upfile = '/path/to/upload.file';

var client = require('../index');
client.fetch('https://up300.net/', function (err, $, res, body) {
  if (err) {
    console.error(err);
    return;
  }

  var $form = $('form');
  $form.find('input[type=file]').val(upfile);
  $form.submit(
    {
      term: '0.5', // 保存期間(30分)
      d_limit: 1, // ダウンロード回数(1回)
      a_list: 1, // アクセス履歴(表示する)
      d_list: 1 // ダウンロード履歴(表示する)
    },
    function (err, $, res, body) {
      if (err) {
        console.error(err);
        return;
      }
      console.log('アップロードしました。', $('#go_download_page').attr('href'));
    }
  );
});

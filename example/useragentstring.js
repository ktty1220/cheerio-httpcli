#!/usr/bin/env node

'use strict';

/**
 * ブラウザ設定確認
 */
var client = require('../index');

client.set('debug', true);
client.set('browser', 'firefox');

client.fetch('http://www.useragentstring.com/')
.then(function (result) {
  console.info(result.$('#dieTabelle th').text());
})
.catch(function (err) {
  console.error(err);
});

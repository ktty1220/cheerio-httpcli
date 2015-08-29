#!/usr/bin/env node
/*jshint node:true */
'use strict';

/**
 * ブラウザ設定確認
 */
var client = require('../index');

client.debug = true;
client.setBrowser('firefox');

client.fetch('http://www.useragentstring.com/')
.then(function (result) {
  console.log(result.$('#dieTabelle th').text());
})
.catch(function (err) {
  console.log(err);
});

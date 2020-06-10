#!/usr/bin/env node

'use strict';

/**
 * マルチインスタンス
 */
const client = require('../index');

// メインインスタンスはfirefox
client.set('browser', 'firefox');

// 子インスタンスはedge
const child = client.fork();
client.set('browser', 'edge');

const checkUserAgent = (instance) => {
  console.log(`### ${instance.constructor.name} ###`);
  return instance
    .fetch('http://www.useragentstring.com/')
    .then(function ({ $ }) {
      // UseAgent判定結果
      console.log('browser is', $('#dieTabelle th').text());
      return instance.fetch('https://www.yahoo.co.jp/');
    })
    .then(function ({ response }) {
      // Yahooから発行されたCookie
      console.log('cookie is', response.cookies, '\n');
    });
};

(async () => {
  await checkUserAgent(client);
  await checkUserAgent(child);
  console.log('main cookie storage', client.exportCookies());
  console.log('cild cookie storage', child.exportCookies());
})();

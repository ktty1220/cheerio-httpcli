#!/usr/bin/env node
/*eslint no-console:0*/

var argv = require('yargs')
.usage('Usage: chhc <url> [options]')
.demand(1)
.options({
  p: {
    alias: 'proxy',
    demand: false,
    describe: 'proxy server address:port',
    type: 'string'
  }
})
.example('chhc http://foo/bar')
.example('chhc http://foo/bar --proxy http://proxy.server:3028/')
.version(function () {
  return require('../package.json').version;
})
.alias('v', 'version')
.help('h')
.alias('h', 'help')
.locale('en')
.argv;

console.info(argv);

/*
<URL>
  fetch URL [params]
  ex)
    http://hoge.fuga/
    http://foo.bar/ a=hoge b="あいうえお かきくけこ"

response
  show response info

$(...)
  show element info
  ex)
    $('title')

$(...).<method>([option])
  exec cheerio method
  ex)
    $('#menu').children()
    $('form').eq(0).fields()

<method>
  exec cheerio method(current element)
  ex)
    click()
    submit({ q: 'what is it' })
    val('hello world!')

timeout <number>
  set timeout property

gzip
  toggle gzip property

referer
  toggle referer property

followMetaRefresh
  toggle followMetaRefresh property

maxDataSize <number|null>
  set maxDataSize property

forceHtml
  toggle forceHtml property

open
  open current page in browser

debug
  toggle debug property

log
  show command log

> <filename>
  output previous command result to file(JSON fromat)
  ex)
    > links.json
*/

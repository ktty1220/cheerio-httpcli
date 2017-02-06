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
.locale('ja')
.argv;

console.info(argv);

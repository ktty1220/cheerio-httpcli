#!/usr/bin/env node
/*eslint no-console:0*/

var readcommand = require('readcommand');
var ora = require('ora');
var typeOf = require('type-of');
var prettyjson = require('prettyjson');
var Promise = require('rsvp').Promise;
var colors = require('colors/safe');
var client = require('../index');

var argv = require('yargs')
.usage('Usage: chhc <url> [options]')
.demand(1)
.options({
  p: {
    alias: 'proxy',
    demand: false,
    describe: 'Proxy server address:port',
    type: 'string'
  }
})
.example('chhc http://foo/bar')
.example('chhc http://foo/bar --proxy http://proxy.server:2694/')
.version(function () {
  return require('../package.json').version;
})
.alias('v', 'version')
.help('h')
.alias('h', 'help')
.locale('en')
.argv;

if (argv.proxy) process.env.HTTP_PROXY = argv.proxy;
var startUrl = argv._[0];
if (! /:\/\//.test(startUrl)) {
  startUrl = 'http://' + startUrl;
}

var show = function (obj) {
  console.info(prettyjson.render(obj));
};

var commands = {
  help: {
    description: 'Show help',
    exec: function (args, $, res, body) {
      console.info(this);
    }
  },
  response: {
    description: 'Show response info',
    exec: function (args, $, res, body) {
      show({
        headers: res.headers,
        cookies: res.cookies
      });
    }
  }
};

Object.keys(client).forEach(function (prop) {
  var type = typeOf(client[prop]);
  if (type === 'number' || prop === 'maxDataSize') {
    commands[prop] = {
      description: 'Set ' + prop + ' property',
      exec: function (args, $, res, body) {
        client.set(prop, parseInt(args[0], 10));
        console.info('changed ' + prop + ' property to', client[prop]);
      }
    };
  }
  if (type === 'boolean') {
    commands[prop] = {
      description: 'Toggle ' + prop + ' property',
      exec: function (args, $, res, body) {
        client.set(prop, ! client[prop]);
        console.info('changed ' + prop + ' property to', client[prop]);
      }
    };
  }
});

/*
<URL>
  fetch URL [params]
  ex)
    http://hoge.fuga/
    http://foo.bar/ a=hoge b="あいうえお かきくけこ"

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

open
  open current page in browser

log
  show command log

> <filename>
  output previous command result to file(JSON fromat)
  ex)
    > links.json
*/


var repl = function ($, res, body) {
  readcommand.loop({
    ps1: '> '
  }, function (err, args, str, next) {
    if (err && err.code !== 'SIGINT') {
      console.error(colors.red(err.message));
      return next();
    }

    // eslint-disable-next-line eqeqeq, no-eq-null
    if (str == null) process.exit();

    var matches = Object.keys(commands).filter(function (com) {
      return (com.indexOf(args[0]) === 0);
    });
    if (matches.length === 1) {
      args.shift();
      var ret = commands[matches[0]].exec(args, $, res, body);
      if (ret instanceof Promise) {
        return ret.catch(function (err) {
          console.error(colors.red(err.message));
        }).finally(next);
      }
      return next();
    }

    console.info('no such command');

    return next();
  });
};

var spinner = ora('fetch ' + startUrl);
spinner.start();
client.fetch(startUrl)
.then(function (result) {
  spinner.succeed('ready');
  return repl(result.$, result.response, result.body);
})
.catch(function (err) {
  spinner.fail(err.message);
  process.exit();
});

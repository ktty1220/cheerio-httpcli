#!/usr/bin/env node
/*eslint no-console:0, no-underscore-dangle:0*/

var readcommand = require('readcommand');
var ora = require('ora');
var logSymbols = require('log-symbols');
var typeOf = require('type-of');
var valUrl    = require('valid-url');
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

var showData = function (data) {
  console.info(prettyjson.render(data));
};

var showSuccess = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(logSymbols.success);
  console.info.apply(console, args);
};

var showError = function (err) {
  console.error(logSymbols.error, String(err));
};

var showElementInfo = function ($, $el) {
  showData($el.map(function (i, el) {
    var dom = $(el).get(0);
    return {
      tagName: dom.name,
      attributes: dom.attribs,
      outerHTML: $.html($(el))
    };
  }).get());
};

var commands = {
  help: {
    description: 'Show help',
    exec: function (args, location) {
      console.info(Object.keys(commands).map(function (com) {
        var c = commands[com];
        var p = colors.yellow((c.params || []).join(' '));
        var lines = [
          com + ' ' + p,
          '  ' + colors.gray(c.description)
        ];
        if (c.examples) {
          lines = lines.concat([
            '  ' + colors.cyan('ex)'),
            '    ' + colors.cyan(c.examples.join('    '))
          ]);
        }
        return lines.join('\n');
      }).join('\n\n'));
    }
  },
  exit: {
    description: 'Exit chhc',
    exec: function (args, location) {
      console.info('bye\n');
      process.exit();
    }
  },
  setting: {
    description: 'Show current settings',
    exec: function (args, location) {
      var settings = {};
      Object.keys(client)
      .filter(function (prop) { return (commands[prop]); })
      .forEach(function (prop) { settings[prop] = client[prop]; });
      showData(settings);
    }
  },
  response: {
    description: 'Show response info',
    exec: function (args, location) {
      var res = location.response;
      showData({
        headers: res.headers,
        cookies: res.cookies
      });
    }
  },
  $: {
    description: 'Show element info',
    examples: [
      '$ #contents > .entry a[href*=hoge]'
    ],
    exec: function (args, location) {
      var $ = location.$;
      location._selector = args.join(' ');
      var $result = $(location._selector);
      location._$target = $result;
      showElementInfo($, $result);
    }
  },
  '.': {
    description: 'Execute cheerio method of current element',
    examples: [
      '. text',
      '. attr src',
      '. click'
    ],
    exec: function (args, location) {
      var $el = location._$target;
      if (! $el) return;
      var method = args.shift();
      var result = $el[method].apply($el, args);
      if (result.cheerio === '[cheerio object]') {
        showElementInfo(location.$, result);
      } else {
        console.info(result);
      }
    }
  }
};

Object.keys(client).forEach(function (prop) {
  var type = typeOf(client[prop]);
  if (type === 'number' || prop === 'maxDataSize') {
    commands[prop] = {
      description: 'Set ' + prop + ' property',
      params: [ '<number>' ],
      exec: function (args, $, res, body) {
        client.set(prop, parseInt(args[0], 10));
        showSuccess(
          'changed', colors.magenta(prop),
          'property to', colors.red(client[prop])
        );
      }
    };
  }
  if (type === 'boolean') {
    commands[prop] = {
      description: 'Toggle ' + prop + ' property',
      exec: function (args, $, res, body) {
        client.set(prop, ! client[prop]);
        showSuccess(
          'changed', colors.magenta(prop),
          'property to', colors.red(client[prop])
        );
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
var normalizeUrl = function (url) {
  if (/:\/\//.test(url)) {
    return url;
  }
  if (/.+\.\w{2,}$/.test(url)) {
    url = 'http://' + url;
  }
  return url;
};

var fetch = function (url, params) {
  var spinner = ora('fetch ' + url);
  spinner.start();
  return client.fetch(url)
  .then(function (result) {
    spinner.succeed('ready');
    return result;
  })
  .catch(function (err) {
    spinner.fail(err.message);
    throw new Error(err);
  });
};

var repl = function (init) {
  var location = init;
  var prompt = function (next) {
    console.info('\n' + colors.blue(location.$.documentInfo().url));
    // eslint-disable-next-line callback-return
    if (next) next();
  };
  prompt();

  readcommand.loop({
    ps1: function () {
      var target = '';
      if (location._selector) {
        target = "$('" + location._selector + "')[" + location._$target.length + '] ';
      }
      return colors.yellow(target) + colors.green('》');
    }
  }, function (err, args, str, next) {
    if (err && err.code !== 'SIGINT') {
      console.error(colors.red(err.message));
      return prompt(next);
    }

    // eslint-disable-next-line eqeqeq, no-eq-null
    if (str == null) {
      return commands.exit.exec();
    }

    var matches = Object.keys(commands).filter(function (com) {
      return (com.indexOf(args[0]) === 0);
    });
    if (matches.length === 1) {
      // 基本コマンドに該当
      args.shift();
      var ret = commands[matches[0]].exec(args, location);
      if (ret instanceof Promise) {
        return ret.catch(showError).finally(function () {
          prompt(next);
        });
      }
      return prompt(next);
    }

    // 特殊コマンド: URL => fetch
    var checkUrl = normalizeUrl(args[0]);
    if (valUrl.isUri(checkUrl)) {
      fetch(checkUrl).then(function (result) {
        location = result;
      }).finally(function () { prompt(next); });
      return null;
    }

    console.info(logSymbols.warning, 'no such command');
    return prompt(next);
  });
};

if (argv.proxy) process.env.HTTP_PROXY = argv.proxy;
fetch(normalizeUrl(argv._[0])).then(repl).catch(process.exit);

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
var complete = require('./complete.json');

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
  console.error(logSymbols.error, colors.red(String(err)));
};

var showWarn = function (msg) {
  console.warn(logSymbols.warning, msg);
};

var showInfo = function (msg) {
  console.info(logSymbols.info, msg);
};

var showElementInfo = function ($, $el, showHtml) {
  showData($el.map(function (i, el) {
    var dom = $(el).get(0);
    var result = {
      tagName: dom.name,
      attributes: dom.attribs,
      childrens: dom.children.length
    };
    if (showHtml) result.outerHTML = $.html($(el));
    return result;
  }).get());
};

var commands = {
  help: {
    description: 'Show help',
    exec: function (args, location, flag) {
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
            '    ' + colors.cyan(c.examples.join('\n    '))
          ]);
        }
        return lines.join('\n');
      }).join('\n\n'));
    }
  },
  exit: {
    description: 'Exit chhc',
    exec: function (args, location, flag) {
      console.info('bye\n');
      process.exit();
    }
  },
  setting: {
    description: 'Show current settings',
    exec: function (args, location, flag) {
      var settings = {};
      Object.keys(client)
      .filter(function (prop) { return (commands[prop]); })
      .forEach(function (prop) { settings[prop] = client[prop]; });
      showData(settings);
    }
  },
  response: {
    description: 'Show response info',
    exec: function (args, location, flag) {
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
    exec: function (args, location, flag) {
      var $ = location.$;
      var selector = args.join(' ');
      var $result = $(selector);
      showElementInfo($, $result, flag);
      if ($result.length > 0) {
        location._$target = $result;
        location._history = [{
          selector: selector
        }];
      }
    }
  },
  '.': {
    description: 'Execute cheerio method of current element',
    params: [
      '<method>',
      '[arg1, arg2, ...]'
    ],
    examples: [
      '. text',
      '. attr src',
      '. find .links > a',
      '. click'
    ],
    exec: function (args, location, flag) {
      if (args.length === 0) return false;
      var matches = complete.filter(function (com) {
        return (com.toLowerCase().indexOf(args[0].toLowerCase()) === 0);
      });

      if (matches.length > 1) {
        showInfo('Did you mean one of these?\n.' + matches.join(' .'));
        return true;
      }

      if (matches.length === 1) {
        args[0] = matches[0];
      }

      var sameElementKey = '__is_same_element__';
      var $el = location._$target;
      if (! $el) {
        showWarn('No element selected');
        return true;
      }
      var method = args.shift();
      if (! $el[method]) return false;

      $el[sameElementKey] = true;
      var result = $el[method].apply($el, args);
      if (result.cheerio === '[cheerio object]') {
        if (result.length > 0 && ! result[sameElementKey]) {
          location._$target = result;
          location._history.push({
            method: method,
            selector: (args.length > 0) ? args.join(' ') : null
          });
        }
        showElementInfo(location.$, result, flag);
      } else {
        console.info(result);
      }
      delete $el[sameElementKey];
      return true;
    }
  },
  '-': {
    description: 'Back to previous element selection',
    exec: function (args, location, flag) {
      location._history.pop();
      if (location._history.length === 0) {
        location._$target = null;
        return;
      }
      var $tmp = location.$(location._history[0].selector);
      location._history.forEach(function (h, i) {
        if (i === 0) return;
        $tmp = $tmp[h.method](h.selector);
      });
      location._$target = $tmp;
    }
  },
  '@': {
    description: 'Redisplay current element',
    exec: function (args, location, flag) {
      if (location._$target) {
        showElementInfo(location.$, location._$target, flag);
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
        var n = parseInt(args[0], 10);
        if (isNaN(n)) {
          n = (type === 'number') ? 0 : null;
        }
        client.set(prop, n);
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
  });
};

var newLocation = function (location) {
  return Object.assign(location, {
    _$target: null,
    _history: []
  });
};

var repl = function (init) {
  var location = newLocation(init);

  var prompt = function (next) {
    console.info('\n' + colors.blue(location.$.documentInfo().url));
    // eslint-disable-next-line callback-return
    if (next) next();
  };

  var done = function (next) {
    return function () {
      return prompt(next);
    };
  };

  var run = function (args, flag) {
    var matches = Object.keys(commands).filter(function (com) {
      return (com.indexOf(args[0]) === 0);
    });
    if (matches.length === 1) {
      // 基本コマンドに該当
      args.shift();
      try {
        var ret = commands[matches[0]].exec(args, location, flag);
        return (ret === false) ? false : ret || true;
      } catch (e) {
        showError(e);
      }
    }

    // 特殊コマンド: URL => fetch
    var checkUrl = normalizeUrl(args[0]);
    if (valUrl.isUri(checkUrl)) {
      return fetch(checkUrl).then(function (result) {
        if (result) location = newLocation(result);
      });
    }

    return false;
  };

  prompt();
  readcommand.loop({
    ps1: function () {
      var target = '';
      if (location._history.length > 0) {
        var selector = location._history.map(function (h) {
          var method = (h.method) ? '.' + h.method : '$';
          var sel = (h.selector) ? "'" + h.selector + "'" : '';
          return method + '(' + sel + ')';
        }).join('');
        target = selector + '[' + location._$target.length + '] ';
      }
      return colors.yellow(target) + colors.green('》');
    }
  }, function (err, args, str, next) {
    if (err && err.code !== 'SIGINT') {
      showError(err);
      return prompt(next);
    }

    // eslint-disable-next-line eqeqeq, no-eq-null
    if (str == null) return commands.exit.exec();
    if (str.length === 0) return prompt(next);

    var m = args[0].match(/^([\.\$])(.+)$/);
    if (m) {
      args.splice(0, 1, m[1], m[2]);
    }

    var tail = args.length - 1;
    m = args[tail].match(/^.+!$/);
    if (m) {
      args[tail] = args[tail].substr(0, args[tail].length - 1);
      args.push('!');
    }

    str = args.join(' ');

    var flag = false;
    if (args[args.length - 1] === '!') {
      args.pop();
      flag = true;
    }

    var ret = run(args, flag);
    if (ret instanceof Promise) {
      return ret.catch(showError).finally(done(next));
    }

    if (! ret) showWarn('No such command');
    return prompt(next);
  });
};

if (argv.proxy) process.env.HTTP_PROXY = argv.proxy;
fetch(normalizeUrl(argv._[0])).then(repl).catch(process.exit);

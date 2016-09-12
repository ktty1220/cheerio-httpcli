/*jshint -W100*/

'use strict';

var client = require('./client');

process.stdin.resume();
process.stdin.setEncoding('utf8');

var input = '';
process.stdin.on('data', function (chunk) {
  input += chunk;
});

process.stdin.on('end', function () {
  var args = JSON.parse(input);
  client.core = args.core;

  // こちらでjarを作りなおす
  args.param.jar = client.engine.jar();
  Object.keys(args.cookies).forEach(function (key) {
    var val = args.cookies[key];
    var cookie = client.engine.cookie(key + '=' + val);
    args.param.jar.setCookie(cookie, args.param.uri);
  });

  client.request(args.param, args.core.gzip, function (err, res, body) {
    if (err) {
      process.stderr.write(err.message);
    }
    process.stdout.write(JSON.stringify({
      body: body,
      response: (res) ? res.toJSON() : null,
      cookies: args.param.jar.getCookies(args.param.uri) || []
    }));
  });
});

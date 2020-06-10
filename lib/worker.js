'use strict';

var instance = require('../index');
var Client = require('./client');
var fs = require('fs');
var each = require('foreach');

process.stdin.resume();
process.stdin.setEncoding('utf8');

var input = '';
process.stdin.on('data', function (chunk) {
  input += chunk;
});

process.stdin.on('end', function () {
  var args = JSON.parse(input);
  each(args.config, function (val, key) {
    instance.set(key, val, true);
  });

  // こちらでjarを作り直す
  instance.importCookies(args.cookies);
  args.param.jar = instance._cookieJar;

  // formDataも作り直す
  var formData = {};
  each(args.formData, function (val, key) {
    formData[key] = Buffer.from(val);
  });
  each(args.uploadFiles, function (val, key) {
    formData[key] = val.map(function (upfile) {
      return fs.createReadStream(upfile);
    });
  });
  if (Object.keys(formData).length > 0) {
    args.param.formData = formData;
  }

  var cli = new Client(instance);
  cli.request(args.param, function (err, res, body) {
    if (err) {
      process.stderr.write(err.message);
    }
    process.stdout.write(
      JSON.stringify({
        body: body,
        response: res ? res.toJSON() : null,
        cookies: instance.exportCookies()
      })
    );
  });
});

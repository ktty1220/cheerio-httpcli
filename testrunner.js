#!/usr/bin/env node

var Mocha = require('mocha');
var path  = require('path');
var fs    = require('fs');
var spawn = require('child_process').spawn;
var which = require('which');
var argv  = require('yargs').argv;
require('mocha-clean');
require('intelli-espower-loader');

var mocha = new Mocha({
  ui: 'bdd',
  reporter: argv.R || 'spec',
  timeout: 5000,
  grep: argv.g
});

var testDir = path.join(__dirname, 'test');
fs.readdirSync(testDir).filter(function (file) {
  return /^[^_].*\.js$/.test(file);
}).forEach(function (file) {
  mocha.addFile(path.join(testDir, file));
});

var server = spawn(which.sync('node'), [ path.join(__dirname, 'test/_server.js') ]);
server.stdout.on('data', function (data) {
  process.stdout.write(data);
});
server.stderr.on('data', function (data) {
  process.stderr.write(data);
});

mocha.run(function (failures) {
  server.kill();
  process.on('exit', function () {
    process.exit(failures);
  });
});

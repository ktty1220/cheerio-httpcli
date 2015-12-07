#!/usr/bin/env node
/*eslint no-console:0*/

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

var server = spawn(which.sync('node'), [
  path.join(__dirname, 'test/_server.js')
], {
  detached: true
});
server.stdout.on('data', function (data) {
  process.stdout.write(data);
});
server.stderr.on('data', function (data) {
  process.stderr.write(data);
});

// Ctrl-C
var stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf-8');
stdin.on('data', function (key) {
  if (key === '\u0003') {
    process.kill(server.pid);
    process.exit();
  }
});

mocha.run(function (failures) {
  process.kill(server.pid);
  process.exit(failures);
});

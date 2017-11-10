#!/usr/bin/env node

var Mocha = require('mocha');
var path  = require('path');
var fs    = require('fs');
var spawn = require('child_process').spawn;
var argv  = require('yargs').argv;
require('mocha-clean');
require('intelli-espower-loader');

var mocha = new Mocha({
  ui: 'bdd',
  reporter: argv.R || 'spec',
  timeout: 20000,
  grep: argv.g
});

var testDir = path.join(__dirname, 'test');
fs.readdirSync(testDir).filter(function (file) {
  return /^[^_].*\.js$/.test(file);
}).forEach(function (file) {
  mocha.addFile(path.join(testDir, file));
});

var server = spawn(process.execPath, [
  path.join(__dirname, 'test/_server.js')
], {
  detached: true
});
server.stdout.on('data', function (data) {
  process.stdout.write(data);
});
server.stderr.on('data', function (data) {
  if (data.toString().trim() === '%%% server ready %%%') {
    // start mocha
    mocha.run(function (failures) {
      process.kill(server.pid);
      process.exit(failures);
    });
    return;
  }
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

/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('cheerio:html', function () {
  it('_html => DEPRICATEDメッセージが表示される', function (done) {
    cli.fetch(helper.url('entities', 'hex'), function (err, $, res, body) {
      helper.hookStderr(function (unhook) {
        $('h1')._html();
        var expected = '[DEPRICATED] _html() will be removed in the future)';
        var actual = unhook();
        assert(actual === expected);
        done();
      });
    });
  });

  it('_text => DEPRICATEDメッセージが表示される', function (done) {
    cli.fetch(helper.url('entities', 'hex'), function (err, $, res, body) {
      helper.hookStderr(function (unhook) {
        $('h1')._text();
        var expected = '[DEPRICATED] _text() will be removed in the future)';
        var actual = unhook();
        assert(actual === expected);
        done();
      });
    });
  });
});

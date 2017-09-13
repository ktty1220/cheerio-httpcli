/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var each   = require('foreach');
var helper = require('./_helper');
var cli    = require('../index');

describe('encoding:auto', function () {
  before(function () {
    cli.set('iconv', 'iconv-lite');
  });

  each(helper.files('auto'), function (enc) {
    it('エンコーディング自動判定により正常にUTF-8に変換される(' + enc + ')', function (done) {
      var url = helper.url('auto', enc);
      cli.fetch(url, function (err, $, res, body) {
        assert.deepEqual($.documentInfo(), {
          url: url,
          encoding: enc,
          isXml: false
        });
        assert($('title').text() === '夏目漱石「私の個人主義」');
        assert($('h1').html() === '<span>夏目漱石「私の個人主義」</span>');
        done();
      });
    });
  });
});

describe('encoding:manual', function () {
  before(function () {
    cli.set('iconv', 'iconv-lite');
  });

  each(helper.files('manual'), function (enc) {
    it('<head>タグのcharsetからエンコーディングが判定され正常にUTF-8に変換される(' + enc + ')', function (done) {
      var url = helper.url('manual', enc);
      cli.fetch(url, function (err, $, res, body) {
        assert.deepEqual($.documentInfo(), {
          url: url,
          encoding: enc.replace(/\(.+\)/, ''),
          isXml: false
        });
        assert($('title').text() === '１');
        done();
      });
    });
  });
});

describe('encoding:error', function () {
  before(function () {
    cli.set('iconv', 'iconv-lite');
  });

  it('iconv-liteで未対応のページは変換エラーとなる(iso-2022-jp)', function (done) {
    var url = helper.url('error', 'iso-2022-jp');
    cli.fetch(url, function (err, $, res, body) {
      assert(err.errno === 22);
      assert(err.code === 'EINVAL');
      assert(err.message === 'EINVAL, Conversion not supported.');
      assert(err.charset === 'iso-2022-jp');
      assert(err.url === url);
      done();
    });
  });
});

describe('encoding:unknown', function () {
  before(function () {
    cli.set('iconv', 'iconv-lite');
  });

  it('自動判定でも<head>タグからも文字コードが判別できない => UTF-8として処理される(utf-8)', function (done) {
    var url = helper.url('unknown', 'utf-8');
    cli.fetch(url, function (err, $, res, body) {
      assert.deepEqual($.documentInfo(), {
        url: url,
        encoding: null,
        isXml: false
      });
      assert($('title').text() === '１');
      done();
    });
  });

  it('自動判定でも<head>タグからも文字コードが判別できない => UTF-8として処理される(shift_jis)', function (done) {
    var url = helper.url('unknown', 'shift_jis');
    cli.fetch(url, function (err, $, res, body) {
      assert.deepEqual($.documentInfo(), {
        url: url,
        encoding: null,
        isXml: false
      });
      assert($('title').text() !== '１');
      done();
    });
  });

  it('fetch時にエンコーディング指定 => shift_jisとして処理される', function (done) {
    var url = helper.url('unknown', 'shift_jis');
    cli.fetch(url, {}, 'sjis', function (err, $, res, body) {
      assert.deepEqual($.documentInfo(), {
        url: url,
        encoding: 'sjis',
        isXml: false
      });
      assert($('title').text() === '１');
      done();
    });
  });

  it('fetch時にエンコーディング指定(param省略) => shift_jisとして処理される', function (done) {
    var url = helper.url('unknown', 'shift_jis');
    cli.fetch(url, 'sjis', function (err, $, res, body) {
      assert.deepEqual($.documentInfo(), {
        url: url,
        encoding: 'sjis',
        isXml: false
      });
      assert($('title').text() === '１');
      done();
    });
  });
});

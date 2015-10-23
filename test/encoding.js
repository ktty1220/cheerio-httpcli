/*eslint-env mocha*/
/*eslint no-invalid-this:0, no-undefined:0*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('encoding:auto', function () {
  before(function () {
    this.server = helper.server();
    cli.setIconvEngine('iconv-lite');
  });
  after(function () {
    this.server.close();
  });

  helper.files('auto').forEach(function (enc) {
    it('エンコーディング自動判定により正常にUTF-8に変換される(' + enc + ')', function (done) {
      var url = helper.url('auto', enc);
      cli.fetch(url, function (err, $, res, body) {
        if (enc === 'x-sjis') {
          enc = 'shift_jis';
        }
        assert.deepEqual($.documentInfo(), {
          url: url,
          encoding: enc
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
    this.server = helper.server();
    cli.setIconvEngine('iconv-lite');
  });
  after(function () {
    this.server.close();
  });

  helper.files('manual').forEach(function (enc) {
    it('<head>タグのcharsetからエンコーディングが判定され正常にUTF-8に変換される(' + enc + ')', function (done) {
      var url = helper.url('manual', enc);
      cli.fetch(url, function (err, $, res, body) {
        assert.deepEqual($.documentInfo(), {
          url: url,
          encoding: enc.replace(/\(.+\)/, '')
        });
        assert($('title').text() === '１');
        done();
      });
    });
  });
});

describe('encoding:error', function () {
  before(function () {
    this.server = helper.server();
    cli.setIconvEngine('iconv-lite');
  });
  after(function () {
    this.server.close();
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
    this.server = helper.server();
    cli.setIconvEngine('iconv-lite');
  });
  after(function () {
    this.server.close();
  });

  it('自動判定でも<head>タグからも文字コードが判別できない場合はUTF-8として処理される(utf-8)', function (done) {
    var url = helper.url('unknown', 'utf-8');
    cli.fetch(url, function (err, $, res, body) {
      assert.deepEqual($.documentInfo(), {
        url: url,
        encoding: undefined
      });
      assert($('title').text() === '１');
      done();
    });
  });

  it('自動判定でも<head>タグからも文字コードが判別できない場合はUTF-8として処理される(shift_jis)', function (done) {
    var url = helper.url('unknown', 'shift_jis');
    cli.fetch(url, function (err, $, res, body) {
      assert.deepEqual($.documentInfo(), {
        url: url,
        encoding: undefined
      });
      assert($('title').text() !== '１');
      done();
    });
  });
});

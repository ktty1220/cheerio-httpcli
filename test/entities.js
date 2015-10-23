/*eslint-env mocha*/
/*eslint max-len:[1, 150, 2], no-invalid-this:0*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('entities:decode', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  var expected = {
    text: '夏目漱石「私の個人主義」',
    html: '夏目漱石「<strong>私の個人主義</strong>」',
    sign: '<"私の個人主義"&\'吾輩は猫である\'>'
  };

  it('16進数エンティティが文字列に変換されている', function (done) {
    cli.fetch(helper.url('entities', 'hex'), function (err, $, res, body) {
      assert($('h1').text() === expected.text);
      assert($('h1').html() === expected.html);
      done();
    });
  });

  it('10進数エンティティが文字列に変換されている', function (done) {
    cli.fetch(helper.url('entities', 'num'), function (err, $, res, body) {
      assert($('h1').text() === expected.text);
      assert($('h1').html() === expected.html);
      done();
    });
  });

  it('16進数と10進数混在エンティティが文字列に変換されている', function (done) {
    cli.fetch(helper.url('entities', 'hex&num'), function (err, $, res, body) {
      assert($('h1').text() === expected.text);
      assert($('h1').html() === expected.html);
      done();
    });
  });

  it('文字参照エンティティが文字列に変換されている', function (done) {
    cli.fetch(helper.url('entities', 'sign'), function (err, $, res, body) {
      for (var i = 1; i <= 3; i++) {
        assert($('h' + i).text() === expected.sign);
        assert($('h' + i).html() === expected.sign);
      }
      done();
    });
  });
});

describe('entities:plain', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  // jscs:disable maximumLineLength
  it('16進数エンティティが文字列に変換されない', function (done) {
    cli.fetch(helper.url('entities', 'hex'), function (err, $, res, body) {
      assert($('h1')._text() === '夏目漱石「&#x79c1;&#x306e;&#x500b;&#x4eba;&#x4e3b;&#x7fa9;」');
      assert($('h1')._html() === '夏目漱石「<strong>&#x79c1;&#x306e;&#x500b;&#x4eba;&#x4e3b;&#x7fa9;</strong>」');
      done();
    });
  });

  it('10進数エンティティが文字列に変換されない', function (done) {
    cli.fetch(helper.url('entities', 'num'), function (err, $, res, body) {
      assert($('h1')._text() === '夏目漱石「&#31169;&#12398;&#20491;&#20154;&#20027;&#32681;」');
      assert($('h1')._html() === '夏目漱石「<strong>&#31169;&#12398;&#20491;&#20154;&#20027;&#32681;</strong>」');
      done();
    });
  });

  it('16進数と10進数混在エンティティが文字列に変換されない', function (done) {
    cli.fetch(helper.url('entities', 'hex&num'), function (err, $, res, body) {
      assert($('h1')._text() === '&#22799;&#30446;&#28465;&#30707;「&#x79c1;&#x306e;&#x500b;&#x4eba;&#x4e3b;&#x7fa9;」');
      assert($('h1')._html() === '&#22799;&#30446;&#28465;&#30707;「<strong>&#x79c1;&#x306e;&#x500b;&#x4eba;&#x4e3b;&#x7fa9;</strong>」');
      done();
    });
  });
  // jscs:enable maximumLineLength

  it('文字参照エンティティが文字列に変換されない', function (done) {
    cli.fetch(helper.url('entities', 'sign'), function (err, $, res, body) {
      var expected = [
        '&lt;&quot;私の個人主義&quot;&amp;&apos;吾輩は猫である&apos;&gt;',
        '&#60;&#34;私の個人主義&#34;&#38;&#39;吾輩は猫である&#39;&#62;',
        '&#x3c;&#x22;私の個人主義&#x22;&#x26;&#x27;吾輩は猫である&#x27;&#x3e;'
      ];
      for (var i = 0; i < 3; i++) {
        var h = 'h' + (i + 1);
        var x = expected[i];
        assert($(h)._text() === x);
        assert($(h)._html() === x);
      }
      done();
    });
  });
});

/*eslint-env mocha*/
/*eslint max-len:[1, 200, 2], no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var he     = require('he');
var helper = require('./_helper');
var cli    = require('../index');

describe('entities:decode', function () {
  var expected = {
    text: '夏目漱石「私の個人主義」',
    html: '夏目漱石「<strong>私の個人主義</strong>」',
    sign: '<"私の個人主義"&\'吾輩は猫である\'>'
  };

  it('16進数エンティティが文字列に変換されている', function (done) {
    cli.fetch(helper.url('entities', 'hex'), function (err, $, res, body) {
      assert($('h1').text() === expected.text);
      assert($('h1').html() === expected.html);
      assert($('h1').entityHtml() === he.encode(expected.html, {
        allowUnsafeSymbols: true
      }));
      done();
    });
  });

  it('10進数エンティティが文字列に変換されている', function (done) {
    cli.fetch(helper.url('entities', 'num'), function (err, $, res, body) {
      assert($('h1').text() === expected.text);
      assert($('h1').html() === expected.html);
      assert($('h1').entityHtml() === he.encode(expected.html, {
        allowUnsafeSymbols: true
      }));
      done();
    });
  });

  it('16進数と10進数混在エンティティが文字列に変換されている', function (done) {
    cli.fetch(helper.url('entities', 'hex&num'), function (err, $, res, body) {
      assert($('h1').text() === expected.text);
      assert($('h1').html() === expected.html);
      assert($('h1').entityHtml() === he.encode(expected.html, {
        allowUnsafeSymbols: true
      }));
      done();
    });
  });

  it('文字参照エンティティが文字列に変換されている', function (done) {
    cli.fetch(helper.url('entities', 'sign'), function (err, $, res, body) {
      for (var i = 1; i <= 3; i++) {
        assert($('h' + i).text() === expected.sign);
        assert($('h' + i).html() === expected.sign);
        assert($('h1').entityHtml() === he.encode(expected.sign, {
          allowUnsafeSymbols: false,
          useNamedReferences: true
        }));
      }
      done();
    });
  });

  it('無から作成したHTMLのエンティティが文字列に変換されている', function (done) {
    cli.fetch(helper.url('entities', 'sign'), function (err, $, res, body) {
      var $html = $('<div/>').html('<footer>&copy; 2015 hoge</footer>');
      assert($html.text() === '© 2015 hoge');
      var expectedHtml = '<footer>© 2015 hoge</footer>';
      assert($html.html() === expectedHtml);
      assert($html.entityHtml() === he.encode(expectedHtml, {
        allowUnsafeSymbols: true,
        useNamedReferences: false
      }));
      done();
    });
  });

  it('エンティティで書かれたattrが文字列に変換されている', function (done) {
    cli.fetch(helper.url('entities', 'etc'), function (err, $, res, body) {
      assert($('img').attr('alt') === expected.text);
      done();
    });
  });

  it('エンティティで書かれたdataが文字列に変換されている', function (done) {
    cli.fetch(helper.url('entities', 'etc'), function (err, $, res, body) {
      assert($('p').data('tips') === expected.sign);
      done();
    });
  });
});

/*eslint-env mocha*/
/*eslint max-nested-callbacks:[1, 7]*/
/*jshint -W100*/
var assert = require('power-assert');
var each   = require('foreach');
var helper = require('./_helper');
var cli    = require('../index');

describe('xml', function () {
  // 名前空間のコロンはフィルタと混同されないように「\\」でエスケープする
  before(function () {
    //eslint-disable-next-line no-invalid-this
    this.expected = {
      channel: {
        title: 'タイトル',
        description: 'RSSテスト',
        language: 'ja',
        pubDate: 'Thu, 1 Dec 2016 00:00:00 +0900'
      },
      item: [{
        title: 'RSS記事1',
        link: 'http://this.is.rss/news1.html',
        pubDate: 'Fri, 2 Dec 2016 00:00:00 +0900',
        'dc\\:author': '山田太郎',
        category: 'その他'
      }, {
        title: 'RSS記事2',
        link: 'http://this.is.rss/news2.php?aaa=%E3%83%86%E3%82%B9%E3%83%88%E3%81%A7%E3%81%99',
        pubDate: 'Sat, 3 Dec 2016 00:00:00 +0900',
        'dc\\:author': '山田次郎',
        category: ' 未登録 '
      }]
    };
  });

  describe('xmlModeでパースされる', function () {
    each([ 'xml', 'rss', 'rdf', 'atom', 'opml', 'xsl', 'xslt' ], function (ext) {
      var contentType = 'text/html';
      var caption = '拡張子';
      if (ext === 'xml') {
        contentType = 'application/xml';
        caption = 'Content-Type';
      }
      it(ext + ': ' + caption + 'で判別', function (done) {
        //eslint-disable-next-line no-invalid-this
        var _this = this;
        cli.fetch(helper.url('~xml') + '.' + ext, function (err, $, res, body) {
          assert(res.headers['content-type'] === contentType);
          assert($.documentInfo().isXml === true);
          var expected = _this.expected;
          each(expected.channel, function (val, name) {
            assert($('channel > ' + name).text() === val);
          });
          assert($('item').length === expected.item.length);
          each(expected.item, function (exp, i) {
            each(exp, function (val, name) {
              assert($('item').eq(i).children(name).text() === val);
            });
          });
          done();
        });
      });
    });
  });

  describe('forceHtml: true', function () {
    before(function () {
      cli.set('forceHtml', true);
    });

    after(function () {
      cli.set('forceHtml', false);
    });

    each([ 'xml', 'rss', 'rdf', 'atom', 'opml', 'xsl', 'xslt' ], function (ext) {
      var contentType = (ext === 'xml') ? 'application/xml' : 'text/html';
      it(ext + ': xmlModeが使用されない', function (done) {
        //eslint-disable-next-line no-invalid-this
        var _this = this;
        cli.fetch(helper.url('~xml') + '.' + ext, function (err, $, res, body) {
          assert(res.headers['content-type'] === contentType);
          assert($.documentInfo().isXml === false);
          var expected = _this.expected;
          each(expected.channel, function (val, name) {
            assert($('channel > ' + name).text() === val);
          });
          assert($('item').length === expected.item.length);
          each(expected.item.map(function (v, i) {
            v.link = '';
            if (i === 1) {
              v.category = '';
            }
            return v;
          }), function (exp, i) {
            each(exp, function (val, name) {
              assert($('item').eq(i).children(name).text() === val);
            });
          });
          done();
        });
      });
    });
  });
});

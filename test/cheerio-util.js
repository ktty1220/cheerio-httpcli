/*eslint-env mocha*/
/*eslint no-undefined:0*/
/*jshint -W100*/
var assert = require('power-assert');
var cutil  = require('../lib/cheerio/util');

describe('cheerio:util', function () {
  describe('inArray', function () {
    it('配列内に該当あり => true', function () {
      assert(cutil.inArray([ 'foo', 'bar', 'baz' ], 'foo') === true);
    });
    it('配列内に該当なし => false', function () {
      assert(cutil.inArray([ 'foo', 'bar', 'baz' ], 'boo') === false);
    });
    it('配列以外 => 例外発生', function () {
      try {
        cutil.inArray('hoge', 'boo');
        throw new Error('not thrown');
      } catch (e) {
        assert(e.message === 'hoge is not Array');
      }
    });
  });

  describe('paramFilter', function () {
    it('文字列 => そのまま返す', function () {
      assert(cutil.paramFilter('hoge') === 'hoge');
    });
    it('0 => そのまま返す', function () {
      assert(cutil.paramFilter(0) === 0);
    });
    it('null/undefined => 空文字を返す', function () {
      assert(cutil.paramFilter(null) === '');
      assert(cutil.paramFilter(undefined) === '');
    });
  });
});

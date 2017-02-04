/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert   = require('power-assert');
var helper   = require('./_helper');
var cli      = require('../index');

describe('maxdatasize', function () {
  before(function () {
    cli.set('timeout', 30000);
  });

  it('デフォルトは受信無制限', function (done) {
    cli.fetch(helper.url('~mega'), function (err, $, res, body) {
      assert(! err);
      assert(body.length === 1024 * 1024);
      done();
    });
  });

  it('maxDataSizeを指定 => 指定したバイト数で受信制限がかかる', function (done) {
    cli.set('maxDataSize', 1024 * 64);
    cli.fetch(helper.url('~mega'), function (err, $, res, body) {
      assert(err.message === 'data size limit over');
      assert(! $);
      assert(! res);
      assert(! body);
      done();
    });
  });
});

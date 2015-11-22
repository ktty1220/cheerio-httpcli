/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
var assert = require('power-assert');
var typeOf = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('fetchSync', function () {
  it('同期リクエストが実行される', function () {
    var result = cli.fetchSync(helper.url('auto', 'utf-8'));
    assert.deepEqual(Object.keys(result).sort(), [ '$', 'body', 'response' ]);
    assert(typeOf(result) === 'object');
    assert(typeOf(result.response) === 'object');
    assert(typeOf(result.$) === 'function');
    assert(typeOf(result.body) === 'string');
    assert(result.$('title').text() === '夏目漱石「私の個人主義」');
  });

  // TODO param
  // TODO POST
  // TODO cookie
  // TODO fail
  // TODO error
  // TODO clickSync
  // TODO submitSync
});

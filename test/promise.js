/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
var assert = require('power-assert');
var type   = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('promise:fetch', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  it('fetch時にコールバックを指定した場合はundefinedが返る', function (done) {
    assert(! cli.fetch(helper.url('~info'), function () {
      done();
    }));
  });

  it('fetch時にコールバックを指定しない場合はpromiseオブジェクトが返る', function (done) {
    var promise = cli.fetch(helper.url('~info'));
    assert(type(promise) === 'object');
    assert(type(promise.then) === 'function');
    assert(type(promise.catch) === 'function');
    assert(type(promise.finally) === 'function');
    promise.finally(done);
  });

  it('promiseによるfetchが正常に完了するとthen->finallyが呼ばれる', function () {
    var called = 0;
    return cli.fetch(helper.url('auto', 'shift_jis'))
    .then(function (result) {
      called++;
      assert.deepEqual(Object.keys(result).sort(), [ '$', 'body', 'response' ]);
      assert(type(result) === 'object');
      assert(type(result.response) === 'object');
      assert(type(result.$) === 'function');
      assert(type(result.body) === 'string');
      assert(result.$('title').text() === '夏目漱石「私の個人主義」');
    })
    .finally(function () {
      assert(called === 1);
    });
  });

  it('promiseによるfetchでエラーが発生するとcatch->finallyが呼ばれる', function () {
    var called = { then: 0, catch: 0 };
    var url = helper.url('error', 'not-found');
    var param = { hoge: 'fuga' };
    return cli.fetch(url, param)
    .then(function (result) {
      called.then++;
    })
    .catch(function (err) {
      called.catch++;
      assert(err instanceof Error);
      assert.deepEqual(Object.keys(err).sort(), [ 'param', 'response', 'statusCode', 'url' ]);
      assert.deepEqual(err.param, param);
      assert(err.message === 'no content');
      assert(err.statusCode === 404);
      assert(err.url === url);
      assert(type(err.response) === 'object');
    })
    .finally(function () {
      assert.deepEqual(called, { then: 0, catch: 1 });
    });
  });
});

describe('promise:click', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  it('click時にコールバックを指定した場合はundefinedが返る', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      assert(! $('a').click(function () {
        done();
      }));
    });
  });

  it('click時にコールバックを指定しない場合はpromiseオブジェクトが返る', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var promise = $('a').click();
      assert(type(promise) === 'object');
      assert(type(promise.then) === 'function');
      assert(type(promise.catch) === 'function');
      assert(type(promise.finally) === 'function');
      promise.finally(done);
    });
  });

  it('promiseによるclickが正常に完了するとthen->finallyが呼ばれる', function () {
    var called = 0;
    return cli.fetch(helper.url('form', 'utf-8'))
    .then(function (result) {
      return result.$('.rel').click();
    })
    .then(function (result) {
      called++;
      assert.deepEqual(Object.keys(result).sort(), [ '$', 'body', 'response' ]);
      assert(type(result) === 'object');
      assert(type(result.response) === 'object');
      assert(type(result.$) === 'function');
      assert(type(result.body) === 'string');
      assert(result.$('title').text() === '夏目漱石「私の個人主義」');
    })
    .finally(function () {
      assert(called === 1);
    });
  });

  it('promiseによるclickでエラーが発生するとcatch->finallyが呼ばれる', function () {
    var called = { then: 0, catch: 0 };
    return cli.fetch(helper.url('form', 'utf-8'))
    .then(function (result) {
      return result.$('.error').click();
    })
    .then(function (result) {
      called.then++;
    })
    .catch(function (err) {
      called.catch++;
      assert(err instanceof Error);
      assert.deepEqual(Object.keys(err).sort(), [ 'response', 'statusCode', 'url' ]);
      assert(err.message === 'no content');
      assert(err.statusCode === 404);
      assert(err.url === helper.url('form', 'xxx'));
      assert(type(err.response) === 'object');
    })
    .finally(function () {
      assert.deepEqual(called, { then: 0, catch: 1 });
    });
  });

  it('promise作成前にclickエラーが発生してもcatch->finallyが呼ばれる', function () {
    var called = { then: 0, catch: 0 };
    var url = helper.url('form', 'utf-8');
    return cli.fetch(url)
    .then(function (result) {
      return result.$('div').click();
    })
    .then(function (result) {
      called.then++;
    })
    .catch(function (err) {
      called.catch++;
      assert(err instanceof Error);
      assert.deepEqual(Object.keys(err).sort(), [ 'url' ]);
      assert(err.message === 'element is not link');
      assert(err.url === url);
    })
    .finally(function () {
      assert.deepEqual(called, { then: 0, catch: 1 });
    });
  });
});

describe('promise:submit', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  it('submit時にコールバックを指定した場合はundefinedが返る', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      assert(! $('form').submit(function () {
        done();
      }));
    });
  });

  it('submit時にコールバックを指定しない場合はpromiseオブジェクトが返る', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var promise = $('form').submit();
      assert(type(promise) === 'object');
      assert(type(promise.then) === 'function');
      assert(type(promise.catch) === 'function');
      assert(type(promise.finally) === 'function');
      promise.finally(done);
    });
  });

  it('promiseによるsubmitが正常に完了するとthen->finallyが呼ばれる', function () {
    var called = 0;
    return cli.fetch(helper.url('form', 'utf-8'))
    .then(function (result) {
      return result.$('form[name=login]').submit({
        user: 'hogehoge',
        password: 'fugafuga'
      });
    })
    .then(function (result) {
      called++;
      assert.deepEqual(Object.keys(result).sort(), [ '$', 'body', 'response' ]);
      assert(type(result) === 'object');
      assert(type(result.response) === 'object');
      assert(type(result.$) === 'function');
      assert(type(result.body) === 'string');
      assert(type(result.response.cookies) === 'object');
      assert(result.response.cookies.user === 'hogehoge');
    })
    .finally(function () {
      assert(called === 1);
    });
  });

  it('promiseによるsubmitでエラーが発生するとcatch->finallyが呼ばれる(GET)', function () {
    var called = { then: 0, catch: 0 };
    return cli.fetch(helper.url('form', 'utf-8'))
    .then(function (result) {
      return result.$('form[name=error]').submit();
    })
    .then(function (result) {
      called.then++;
    })
    .catch(function (err) {
      called.catch++;
      assert(err instanceof Error);
      assert.deepEqual(Object.keys(err).sort(), [ 'param', 'response', 'statusCode', 'url' ]);
      assert(err.message === 'no content');
      assert(err.statusCode === 404);
      assert(err.url === helper.url('form', 'xxx'));
      assert(type(err.response) === 'object');
    })
    .finally(function () {
      assert.deepEqual(called, { then: 0, catch: 1 });
    });
  });

  it('promiseによるsubmitでエラーが発生するとcatch->finallyが呼ばれる(POST)', function () {
    var called = { then: 0, catch: 0 };
    return cli.fetch(helper.url('form', 'utf-8'))
    .then(function (result) {
      return result.$('form[name="error-post"]').submit();
    })
    .then(function (result) {
      called.then++;
    })
    .catch(function (err) {
      called.catch++;
      assert(err instanceof Error);
      assert.deepEqual(Object.keys(err).sort(), [ 'param', 'response', 'statusCode', 'url' ]);
      assert(err.message === 'no content');
      assert(err.statusCode === 404);
      assert(err.url === helper.url('form', 'xxx'));
      assert(type(err.response) === 'object');
    })
    .finally(function () {
      assert.deepEqual(called, { then: 0, catch: 1 });
    });
  });

  it('promise作成前にsubmitエラーが発生してもcatch->finallyが呼ばれる', function () {
    var called = { then: 0, catch: 0 };
    var url = helper.url('form', 'utf-8');
    return cli.fetch(url)
    .then(function (result) {
      return result.$('div').submit();
    })
    .then(function (result) {
      called.then++;
    })
    .catch(function (err) {
      called.catch++;
      assert(err instanceof Error);
      assert.deepEqual(Object.keys(err).sort(), [ 'url' ]);
      assert(err.message === 'element is not form');
      assert(err.url === url);
    })
    .finally(function () {
      assert.deepEqual(called, { then: 0, catch: 1 });
    });
  });
});

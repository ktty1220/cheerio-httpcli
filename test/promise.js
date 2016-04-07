/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
/*jshint -W100*/
var assert = require('power-assert');
var typeOf = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('promise:fetch', function () {
  it('fetch時にコールバックを指定 => undefinedを返す', function (done) {
    assert(! cli.fetch(helper.url('~info'), function () {
      done();
    }));
  });

  it('fetch時にコールバックを指定しない => promiseオブジェクトを返す', function (done) {
    var promise = cli.fetch(helper.url('~info'));
    assert(typeOf(promise) === 'object');
    assert(typeOf(promise.then) === 'function');
    assert(typeOf(promise.catch) === 'function');
    assert(typeOf(promise.finally) === 'function');
    promise.finally(done);
  });

  it('promiseによるfetchが正常に完了 => then->finallyが呼ばれる', function () {
    var called = 0;
    return cli.fetch(helper.url('auto', 'shift_jis'))
    .then(function (result) {
      called++;
      assert.deepEqual(Object.keys(result).sort(), [ '$', 'body', 'response' ]);
      assert(typeOf(result) === 'object');
      assert(typeOf(result.response) === 'object');
      assert(typeOf(result.$) === 'function');
      assert(typeOf(result.body) === 'string');
      assert(result.$('title').text() === '夏目漱石「私の個人主義」');
    })
    .finally(function () {
      assert(called === 1);
    });
  });

  it('promiseによるfetchでエラーが発生 => catch->finallyが呼ばれる', function () {
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
      assert(typeOf(err.response) === 'object');
    })
    .finally(function () {
      assert.deepEqual(called, { then: 0, catch: 1 });
    });
  });
});

describe('promise:click', function () {
  describe('a要素', function () {
    it('click時にコールバックを指定 => undefinedを返す', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        assert(! $('a').click(function () {
          done();
        }));
      });
    });

    it('click時にコールバックを指定しない => promiseオブジェクトを返す', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var promise = $('a').click();
        assert(typeOf(promise) === 'object');
        assert(typeOf(promise.then) === 'function');
        assert(typeOf(promise.catch) === 'function');
        assert(typeOf(promise.finally) === 'function');
        promise.finally(done);
      });
    });

    it('promiseによるclickが正常に完了 => then->finallyが呼ばれる', function () {
      var called = 0;
      return cli.fetch(helper.url('form', 'utf-8'))
      .then(function (result) {
        return result.$('.rel').click();
      })
      .then(function (result) {
        called++;
        assert.deepEqual(Object.keys(result).sort(), [ '$', 'body', 'response' ]);
        assert(typeOf(result) === 'object');
        assert(typeOf(result.response) === 'object');
        assert(typeOf(result.$) === 'function');
        assert(typeOf(result.body) === 'string');
        assert(result.$('title').text() === '夏目漱石「私の個人主義」');
      })
      .finally(function () {
        assert(called === 1);
      });
    });

    it('promiseによるclickでエラーが発生 => catch->finallyが呼ばれる', function () {
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
        assert(typeOf(err.response) === 'object');
      })
      .finally(function () {
        assert.deepEqual(called, { then: 0, catch: 1 });
      });
    });

    it('promise作成前にclickエラーが発生 => catch->finallyが呼ばれる', function () {
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
        assert(err.message === 'element is not clickable');
        assert(err.url === url);
      })
      .finally(function () {
        assert.deepEqual(called, { then: 0, catch: 1 });
      });
    });
  });

  describe('input[type=submit]要素', function () {
    it('click時にコールバックを指定 => undefinedを返す', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=multi-submit]');
        assert(! $form.find('[name=edit]').click(function () {
          done();
        }));
      });
    });

    it('click時にコールバックを指定しない => promiseオブジェクトを返す', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=multi-submit]');
        var promise = $form.find('[name=edit]').click();
        assert(typeOf(promise) === 'object');
        assert(typeOf(promise.then) === 'function');
        assert(typeOf(promise.catch) === 'function');
        assert(typeOf(promise.finally) === 'function');
        promise.finally(done);
      });
    });

    it('promiseによるclickが正常に完了 => then->finallyが呼ばれる', function () {
      var called = 0;
      return cli.fetch(helper.url('form', 'utf-8'))
      .then(function (result) {
        var $form = result.$('form[name=multi-submit]');
        return $form.find('[name=edit]').click();
      })
      .then(function (result) {
        called++;
        assert.deepEqual(Object.keys(result).sort(), [ '$', 'body', 'response' ]);
        assert(typeOf(result) === 'object');
        assert(typeOf(result.response) === 'object');
        assert(typeOf(result.$) === 'function');
        assert(result.body === '<html></html>');
        var h = result.response.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');

        var ep = 'text='
        + encodeURIComponent('あいうえお')
        + '&checkbox=bbb&edit='
        + encodeURIComponent('編集');
        assert(h['post-data'] === ep);
      })
      .finally(function () {
        assert(called === 1);
      });
    });

    it('promiseによるclickでエラーが発生 => catch->finallyが呼ばれる', function () {
      var called = { then: 0, catch: 0 };
      return cli.fetch(helper.url('form', 'utf-8'))
      .then(function (result) {
        var $form = result.$('form[name=error]');
        return $form.find('input[type=submit]').click();
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
        assert(typeOf(err.response) === 'object');
      })
      .finally(function () {
        assert.deepEqual(called, { then: 0, catch: 1 });
      });
    });
  });

  describe('button[type=submit]要素', function () {
    it('click時にコールバックを指定 => undefinedを返す', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=multi-submit]');
        assert(! $form.find('[name=delete]').click(function () {
          done();
        }));
      });
    });

    it('click時にコールバックを指定しない => promiseオブジェクトを返す', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=multi-submit]');
        var promise = $form.find('[name=delete]').click();
        assert(typeOf(promise) === 'object');
        assert(typeOf(promise.then) === 'function');
        assert(typeOf(promise.catch) === 'function');
        assert(typeOf(promise.finally) === 'function');
        promise.finally(done);
      });
    });

    it('promiseによるclickが正常に完了 => then->finallyが呼ばれる', function () {
      var called = 0;
      return cli.fetch(helper.url('form', 'utf-8'))
      .then(function (result) {
        var $form = result.$('form[name=multi-submit]');
        return $form.find('[name=delete]').click();
      })
      .then(function (result) {
        called++;
        assert.deepEqual(Object.keys(result).sort(), [ '$', 'body', 'response' ]);
        assert(typeOf(result) === 'object');
        assert(typeOf(result.response) === 'object');
        assert(typeOf(result.$) === 'function');
        assert(result.body === '<html></html>');
        var h = result.response.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');

        var ep = 'text='
        + encodeURIComponent('あいうえお')
        + '&checkbox=bbb&delete='
        + encodeURIComponent('削除');
        assert(h['post-data'] === ep);
      })
      .finally(function () {
        assert(called === 1);
      });
    });

    it('promiseによるclickでエラーが発生 => catch->finallyが呼ばれる', function () {
      var called = { then: 0, catch: 0 };
      return cli.fetch(helper.url('form', 'utf-8'))
      .then(function (result) {
        var $form = result.$('form[name=error]');
        return $form.find('button[type=submit]').click();
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
        assert(typeOf(err.response) === 'object');
      })
      .finally(function () {
        assert.deepEqual(called, { then: 0, catch: 1 });
      });
    });
  });

  describe('input[type=image]要素', function () {
    it('click時にコールバックを指定 => undefinedを返す', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=multi-submit]');
        assert(! $form.find('[name=tweet]').click(function () {
          done();
        }));
      });
    });

    it('click時にコールバックを指定しない => promiseオブジェクトを返す', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $form = $('form[name=multi-submit]');
        var promise = $form.find('[name=tweet]').click();
        assert(typeOf(promise) === 'object');
        assert(typeOf(promise.then) === 'function');
        assert(typeOf(promise.catch) === 'function');
        assert(typeOf(promise.finally) === 'function');
        promise.finally(done);
      });
    });

    it('promiseによるclickが正常に完了 => then->finallyが呼ばれる', function () {
      var called = 0;
      return cli.fetch(helper.url('form', 'utf-8'))
      .then(function (result) {
        var $form = result.$('form[name=multi-submit]');
        return $form.find('[name=tweet]').click();
      })
      .then(function (result) {
        called++;
        assert.deepEqual(Object.keys(result).sort(), [ '$', 'body', 'response' ]);
        assert(typeOf(result) === 'object');
        assert(typeOf(result.response) === 'object');
        assert(typeOf(result.$) === 'function');
        assert(result.body === '<html></html>');
        var h = result.response.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');

        var ep = 'text='
        + encodeURIComponent('あいうえお')
        + '&checkbox=bbb&tweet.x=0&tweet.y=0';
        assert(h['post-data'] === ep);
      })
      .finally(function () {
        assert(called === 1);
      });
    });

    it('promiseによるclickでエラーが発生 => catch->finallyが呼ばれる', function () {
      var called = { then: 0, catch: 0 };
      return cli.fetch(helper.url('form', 'utf-8'))
      .then(function (result) {
        var $form = result.$('form[name=error]');
        return $form.find('input[type=image]').click();
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
        assert(typeOf(err.response) === 'object');
      })
      .finally(function () {
        assert.deepEqual(called, { then: 0, catch: 1 });
      });
    });
  });
});

describe('promise:submit', function () {
  it('submit時にコールバックを指定 => undefinedを返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      assert(! $('form').submit(function () {
        done();
      }));
    });
  });

  it('submit時にコールバックを指定しない => promiseオブジェクトを返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var promise = $('form').submit();
      assert(typeOf(promise) === 'object');
      assert(typeOf(promise.then) === 'function');
      assert(typeOf(promise.catch) === 'function');
      assert(typeOf(promise.finally) === 'function');
      promise.finally(done);
    });
  });

  it('promiseによるsubmitが正常に完了 => then->finallyが呼ばれる', function () {
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
      assert(typeOf(result) === 'object');
      assert(typeOf(result.response) === 'object');
      assert(typeOf(result.$) === 'function');
      assert(typeOf(result.body) === 'string');
      assert(typeOf(result.response.cookies) === 'object');
      assert(result.response.cookies.user === 'hogehoge');
    })
    .finally(function () {
      assert(called === 1);
    });
  });

  it('promiseによるsubmitでエラーが発生 => catch->finallyが呼ばれる(GET)', function () {
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
      assert.deepEqual(Object.keys(err).sort(), [ 'response', 'statusCode', 'url' ]);
      assert(err.message === 'no content');
      assert(err.statusCode === 404);
      assert(err.url === helper.url('form', 'xxx'));
      assert(typeOf(err.response) === 'object');
    })
    .finally(function () {
      assert.deepEqual(called, { then: 0, catch: 1 });
    });
  });

  it('promiseによるsubmitでエラーが発生 => catch->finallyが呼ばれる(POST)', function () {
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
      assert(typeOf(err.response) === 'object');
    })
    .finally(function () {
      assert.deepEqual(called, { then: 0, catch: 1 });
    });
  });

  it('promise作成前にsubmitエラーが発生 => catch->finallyが呼ばれる', function () {
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

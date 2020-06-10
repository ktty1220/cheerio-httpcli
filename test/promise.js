const helper = require('./_helper');
const cli = require('../index');
const typeOf = require('type-of');
const endpoint = helper.endpoint();

describe('promise:fetch', () => {
  test('fetch時にコールバックを指定 => undefinedを返す', () => {
    expect(cli.fetch(`${endpoint}/~info`, () => {})).toBeUndefined();
  });

  test('fetch時にコールバックを指定しない => promiseオブジェクトを返す', () => {
    return new Promise((resolve) => {
      const promise = cli.fetch(`${endpoint}/~info`);
      expect(typeOf(promise)).toStrictEqual('object');
      expect(typeOf(promise.then)).toStrictEqual('function');
      expect(typeOf(promise.catch)).toStrictEqual('function');
      expect(typeOf(promise.finally)).toStrictEqual('function');
      promise.finally(resolve);
    });
  });

  test('promiseによるfetchが正常に完了 => then->finallyが呼ばれる', () => {
    let called = 0;
    return cli
      .fetch(`${endpoint}/auto/shift_jis.html`)
      .then((result) => {
        called++;
        expect(Object.keys(result).sort()).toStrictEqual(['$', 'body', 'response']);
        expect(typeOf(result)).toStrictEqual('object');
        expect(typeOf(result.response)).toStrictEqual('object');
        expect(typeOf(result.$)).toStrictEqual('function');
        expect(typeOf(result.body)).toStrictEqual('string');
        expect(result.$('title').text()).toStrictEqual('夏目漱石「私の個人主義」');
      })
      .finally(() => {
        expect(called).toStrictEqual(1);
      });
  });

  test('promiseによるfetchでエラーが発生 => catch->finallyが呼ばれる', () => {
    const called = { then: 0, catch: 0 };
    const url = `${endpoint}/error/not-found.html`;
    const param = { hoge: 'fuga' };
    return cli
      .fetch(url, param)
      .then((result) => {
        called.then++;
      })
      .catch((err) => {
        called.catch++;
        expect(err).toBeInstanceOf(Error);
        expect(Object.keys(err).sort()).toStrictEqual(['param', 'response', 'statusCode', 'url']);
        expect(err.param).toStrictEqual(param);
        expect(err.message).toStrictEqual('no content');
        expect(err.statusCode).toStrictEqual(404);
        expect(err.url).toStrictEqual(url);
        expect(typeOf(err.response)).toStrictEqual('object');
      })
      .finally(() => {
        expect(called).toStrictEqual({ then: 0, catch: 1 });
      });
  });
});

describe('promise:click', () => {
  describe('a要素', () => {
    test('click時にコールバックを指定 => undefinedを返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          expect($('a').click(() => {})).toBeUndefined();
          resolve();
        });
      });
    });

    test('click時にコールバックを指定しない => promiseオブジェクトを返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const promise = $('a').click();
          expect(typeOf(promise)).toStrictEqual('object');
          expect(typeOf(promise.then)).toStrictEqual('function');
          expect(typeOf(promise.catch)).toStrictEqual('function');
          expect(typeOf(promise.finally)).toStrictEqual('function');
          promise.finally(resolve);
        });
      });
    });

    test('promiseによるclickが正常に完了 => then->finallyが呼ばれる', () => {
      let called = 0;
      return cli
        .fetch(`${endpoint}/form/utf-8.html`)
        .then((result) => result.$('.rel').click())
        .then((result) => {
          called++;
          expect(Object.keys(result).sort()).toStrictEqual(['$', 'body', 'response']);
          expect(typeOf(result)).toStrictEqual('object');
          expect(typeOf(result.response)).toStrictEqual('object');
          expect(typeOf(result.$)).toStrictEqual('function');
          expect(typeOf(result.body)).toStrictEqual('string');
          expect(result.$('title').text()).toStrictEqual('夏目漱石「私の個人主義」');
        })
        .finally(() => {
          expect(called).toStrictEqual(1);
        });
    });

    test('promiseによるclickでエラーが発生 => catch->finallyが呼ばれる', () => {
      const called = { then: 0, catch: 0 };
      return cli
        .fetch(`${endpoint}/form/utf-8.html`)
        .then((result) => result.$('.error').click())
        .then((result) => {
          called.then++;
        })
        .catch((err) => {
          called.catch++;
          expect(err).toBeInstanceOf(Error);
          expect(Object.keys(err).sort()).toStrictEqual(['response', 'statusCode', 'url']);
          expect(err.message).toStrictEqual('no content');
          expect(err.statusCode).toStrictEqual(404);
          expect(err.url).toStrictEqual(`${endpoint}/form/xxx.html`);
          expect(typeOf(err.response)).toStrictEqual('object');
        })
        .finally(() => {
          expect(called).toStrictEqual({ then: 0, catch: 1 });
        });
    });

    test('promise作成前にclickエラーが発生 => catch->finallyが呼ばれる', () => {
      const called = { then: 0, catch: 0 };
      const url = `${endpoint}/form/utf-8.html`;
      return cli
        .fetch(url)
        .then((result) => result.$('div').click())
        .then((result) => {
          called.then++;
        })
        .catch((err) => {
          called.catch++;
          expect(err).toBeInstanceOf(Error);
          expect(Object.keys(err).sort()).toStrictEqual(['url']);
          expect(err.message).toStrictEqual('element is not clickable');
          expect(err.url).toStrictEqual(url);
        })
        .finally(() => {
          expect(called).toStrictEqual({ then: 0, catch: 1 });
        });
    });
  });

  describe('input[type=submit]要素', () => {
    test('click時にコールバックを指定 => undefinedを返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=multi-submit]');
          expect($form.find('[name=edit]').click(() => {})).toBeUndefined();
          resolve();
        });
      });
    });

    test('click時にコールバックを指定しない => promiseオブジェクトを返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=multi-submit]');
          const promise = $form.find('[name=edit]').click();
          expect(typeOf(promise)).toStrictEqual('object');
          expect(typeOf(promise.then)).toStrictEqual('function');
          expect(typeOf(promise.catch)).toStrictEqual('function');
          expect(typeOf(promise.finally)).toStrictEqual('function');
          promise.finally(resolve);
        });
      });
    });

    test('promiseによるclickが正常に完了 => then->finallyが呼ばれる', () => {
      let called = 0;
      return cli
        .fetch(`${endpoint}/form/utf-8.html`)
        .then((result) => {
          const $form = result.$('form[name=multi-submit]');
          return $form.find('[name=edit]').click();
        })
        .then((result) => {
          called++;
          expect(Object.keys(result).sort()).toStrictEqual(['$', 'body', 'response']);
          expect(typeOf(result)).toStrictEqual('object');
          expect(typeOf(result.response)).toStrictEqual('object');
          expect(typeOf(result.$)).toStrictEqual('function');
          expect(result.body).toStrictEqual('<html></html>');
          const h = result.response.headers;
          expect(h['request-url']).toStrictEqual('/~info');
          expect(h['request-method']).toStrictEqual('POST');

          const ep = `text=${encodeURIComponent(
            'あいうえお'
          )}&checkbox=bbb&edit=${encodeURIComponent('編集')}`;
          expect(h['post-data']).toStrictEqual(ep);
        })
        .finally(() => {
          expect(called).toStrictEqual(1);
        });
    });

    test('promiseによるclickでエラーが発生 => catch->finallyが呼ばれる', () => {
      const called = { then: 0, catch: 0 };
      return cli
        .fetch(`${endpoint}/form/utf-8.html`)
        .then((result) => {
          const $form = result.$('form[name=error]');
          return $form.find('input[type=submit]').click();
        })
        .then((result) => {
          called.then++;
        })
        .catch((err) => {
          called.catch++;
          expect(err).toBeInstanceOf(Error);
          expect(Object.keys(err).sort()).toStrictEqual(['response', 'statusCode', 'url']);
          expect(err.message).toStrictEqual('no content');
          expect(err.statusCode).toStrictEqual(404);
          expect(err.url).toStrictEqual(`${endpoint}/form/xxx.html`);
          expect(typeOf(err.response)).toStrictEqual('object');
        })
        .finally(() => {
          expect(called).toStrictEqual({ then: 0, catch: 1 });
        });
    });
  });

  describe('button[type=submit]要素', () => {
    test('click時にコールバックを指定 => undefinedを返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=multi-submit]');
          expect($form.find('[name=delete]').click(() => {})).toBeUndefined();
          resolve();
        });
      });
    });

    test('click時にコールバックを指定しない => promiseオブジェクトを返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=multi-submit]');
          const promise = $form.find('[name=delete]').click();
          expect(typeOf(promise)).toStrictEqual('object');
          expect(typeOf(promise.then)).toStrictEqual('function');
          expect(typeOf(promise.catch)).toStrictEqual('function');
          expect(typeOf(promise.finally)).toStrictEqual('function');
          promise.finally(resolve);
        });
      });
    });

    test('promiseによるclickが正常に完了 => then->finallyが呼ばれる', () => {
      let called = 0;
      return cli
        .fetch(`${endpoint}/form/utf-8.html`)
        .then((result) => {
          const $form = result.$('form[name=multi-submit]');
          return $form.find('[name=delete]').click();
        })
        .then((result) => {
          called++;
          expect(Object.keys(result).sort()).toStrictEqual(['$', 'body', 'response']);
          expect(typeOf(result)).toStrictEqual('object');
          expect(typeOf(result.response)).toStrictEqual('object');
          expect(typeOf(result.$)).toStrictEqual('function');
          expect(result.body).toStrictEqual('<html></html>');
          const h = result.response.headers;
          expect(h['request-url']).toStrictEqual('/~info');
          expect(h['request-method']).toStrictEqual('POST');

          const ep = `text=${encodeURIComponent(
            'あいうえお'
          )}&checkbox=bbb&delete=${encodeURIComponent('削除')}`;
          expect(h['post-data']).toStrictEqual(ep);
        })
        .finally(() => {
          expect(called).toStrictEqual(1);
        });
    });

    test('promiseによるclickでエラーが発生 => catch->finallyが呼ばれる', () => {
      const called = { then: 0, catch: 0 };
      return cli
        .fetch(`${endpoint}/form/utf-8.html`)
        .then((result) => {
          const $form = result.$('form[name=error]');
          return $form.find('button[type=submit]').click();
        })
        .then((result) => {
          called.then++;
        })
        .catch((err) => {
          called.catch++;
          expect(err).toBeInstanceOf(Error);
          expect(Object.keys(err).sort()).toStrictEqual(['response', 'statusCode', 'url']);
          expect(err.message).toStrictEqual('no content');
          expect(err.statusCode).toStrictEqual(404);
          expect(err.url).toStrictEqual(`${endpoint}/form/xxx.html`);
          expect(typeOf(err.response)).toStrictEqual('object');
        })
        .finally(() => {
          expect(called).toStrictEqual({ then: 0, catch: 1 });
        });
    });
  });

  describe('input[type=image]要素', () => {
    test('click時にコールバックを指定 => undefinedを返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=multi-submit]');
          expect($form.find('[name=tweet]').click(() => {})).toBeUndefined();
          resolve();
        });
      });
    });

    test('click時にコールバックを指定しない => promiseオブジェクトを返す', () => {
      return new Promise((resolve) => {
        cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
          const $form = $('form[name=multi-submit]');
          const promise = $form.find('[name=tweet]').click();
          expect(typeOf(promise)).toStrictEqual('object');
          expect(typeOf(promise.then)).toStrictEqual('function');
          expect(typeOf(promise.catch)).toStrictEqual('function');
          expect(typeOf(promise.finally)).toStrictEqual('function');
          promise.finally(resolve);
        });
      });
    });

    test('promiseによるclickが正常に完了 => then->finallyが呼ばれる', () => {
      let called = 0;
      return cli
        .fetch(`${endpoint}/form/utf-8.html`)
        .then((result) => {
          const $form = result.$('form[name=multi-submit]');
          return $form.find('[name=tweet]').click();
        })
        .then((result) => {
          called++;
          expect(Object.keys(result).sort()).toStrictEqual(['$', 'body', 'response']);
          expect(typeOf(result)).toStrictEqual('object');
          expect(typeOf(result.response)).toStrictEqual('object');
          expect(typeOf(result.$)).toStrictEqual('function');
          expect(result.body).toStrictEqual('<html></html>');
          const h = result.response.headers;
          expect(h['request-url']).toStrictEqual('/~info');
          expect(h['request-method']).toStrictEqual('POST');

          const ep = `text=${encodeURIComponent('あいうえお')}&checkbox=bbb&tweet.x=0&tweet.y=0`;
          expect(h['post-data']).toStrictEqual(ep);
        })
        .finally(() => {
          expect(called).toStrictEqual(1);
        });
    });

    test('promiseによるclickでエラーが発生 => catch->finallyが呼ばれる', () => {
      const called = { then: 0, catch: 0 };
      return cli
        .fetch(`${endpoint}/form/utf-8.html`)
        .then((result) => {
          const $form = result.$('form[name=error]');
          return $form.find('input[type=image]').click();
        })
        .then((result) => {
          called.then++;
        })
        .catch((err) => {
          called.catch++;
          expect(err).toBeInstanceOf(Error);
          expect(Object.keys(err).sort()).toStrictEqual(['response', 'statusCode', 'url']);
          expect(err.message).toStrictEqual('no content');
          expect(err.statusCode).toStrictEqual(404);
          expect(err.url).toStrictEqual(`${endpoint}/form/xxx.html`);
          expect(typeOf(err.response)).toStrictEqual('object');
        })
        .finally(() => {
          expect(called).toStrictEqual({ then: 0, catch: 1 });
        });
    });
  });
});

describe('promise:submit', () => {
  test('submit時にコールバックを指定 => undefinedを返す', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        expect($('form').submit(() => {})).toBeUndefined();
        resolve();
      });
    });
  });

  test('submit時にコールバックを指定しない => promiseオブジェクトを返す', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        const promise = $('form').submit();
        expect(typeOf(promise)).toStrictEqual('object');
        expect(typeOf(promise.then)).toStrictEqual('function');
        expect(typeOf(promise.catch)).toStrictEqual('function');
        expect(typeOf(promise.finally)).toStrictEqual('function');
        promise.finally(resolve);
      });
    });
  });

  test('promiseによるsubmitが正常に完了 => then->finallyが呼ばれる', () => {
    let called = 0;
    return cli
      .fetch(`${endpoint}/form/utf-8.html`)
      .then((result) => {
        return result.$('form[name=login]').submit({
          user: 'hogehoge',
          password: 'fugafuga'
        });
      })
      .then((result) => {
        called++;
        expect(Object.keys(result).sort()).toStrictEqual(['$', 'body', 'response']);
        expect(typeOf(result)).toStrictEqual('object');
        expect(typeOf(result.response)).toStrictEqual('object');
        expect(typeOf(result.$)).toStrictEqual('function');
        expect(typeOf(result.body)).toStrictEqual('string');
        expect(typeOf(result.response.cookies)).toStrictEqual('object');
        expect(result.response.cookies.user).toStrictEqual('hogehoge');
      })
      .finally(() => {
        expect(called).toStrictEqual(1);
      });
  });

  test('promiseによるsubmitでエラーが発生 => catch->finallyが呼ばれる(GET)', () => {
    const called = { then: 0, catch: 0 };
    return cli
      .fetch(`${endpoint}/form/utf-8.html`)
      .then((result) => result.$('form[name=error]').submit())
      .then((result) => {
        called.then++;
      })
      .catch((err) => {
        called.catch++;
        expect(err).toBeInstanceOf(Error);
        expect(Object.keys(err).sort()).toStrictEqual(['response', 'statusCode', 'url']);
        expect(err.message).toStrictEqual('no content');
        expect(err.statusCode).toStrictEqual(404);
        expect(err.url).toStrictEqual(`${endpoint}/form/xxx.html`);
        expect(typeOf(err.response)).toStrictEqual('object');
      })
      .finally(() => {
        expect(called).toStrictEqual({ then: 0, catch: 1 });
      });
  });

  test('promiseによるsubmitでエラーが発生 => catch->finallyが呼ばれる(POST)', () => {
    const called = { then: 0, catch: 0 };
    return cli
      .fetch(`${endpoint}/form/utf-8.html`)
      .then((result) => result.$('form[name="error-post"]').submit())
      .then((result) => {
        called.then++;
      })
      .catch((err) => {
        called.catch++;
        expect(err).toBeInstanceOf(Error);
        expect(Object.keys(err).sort()).toStrictEqual(['param', 'response', 'statusCode', 'url']);
        expect(err.message).toStrictEqual('no content');
        expect(err.statusCode).toStrictEqual(404);
        expect(err.url).toStrictEqual(`${endpoint}/form/xxx.html`);
        expect(typeOf(err.response)).toStrictEqual('object');
      })
      .finally(() => {
        expect(called).toStrictEqual({ then: 0, catch: 1 });
      });
  });

  test('promise作成前にsubmitエラーが発生 => catch->finallyが呼ばれる', () => {
    const called = { then: 0, catch: 0 };
    const url = `${endpoint}/form/utf-8.html`;
    return cli
      .fetch(url)
      .then((result) => result.$('div').submit())
      .then((result) => {
        called.then++;
      })
      .catch((err) => {
        called.catch++;
        expect(err).toBeInstanceOf(Error);
        expect(Object.keys(err).sort()).toStrictEqual(['url']);
        expect(err.message).toStrictEqual('element is not form');
        expect(err.url).toStrictEqual(url);
      })
      .finally(() => {
        expect(called).toStrictEqual({ then: 0, catch: 1 });
      });
  });
});

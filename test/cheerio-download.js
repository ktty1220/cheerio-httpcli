/*eslint-env mocha*/
/*eslint no-invalid-this:0*/
var assert = require('power-assert');
var helper = require('./_helper');
var cli    = require('../index');

describe('cheerio:download', function () {
  beforeEach(function () {
    cli.download.state = { queue: 0, complete: 0 };
    cli.download.removeAllListeners();
  });
  afterEach(function () {
    cli.timeout = 30000;
  });

  it('img要素以外 => エラー', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      try {
        $('body').download();
        throw new Error('not thrown');
      } catch (e) {
        assert(e.message === 'element is not img');
      }
      done();
    });
  });

  describe('同時実行数指定', function () {
    it('1未満', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        try {
          cli.download.concurrency = 0;
          $('.rel').download();
        } catch (e) {
          assert(e.message === 'valid download concurrency range is 1 and 5');
        } finally {
          cli.download.concurrency = 5;
        }
        done();
      });
    });

    it('6以上', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        try {
          cli.download.concurrency = 6;
          $('.rel').download();
        } catch (e) {
          assert(e.message === 'valid download concurrency range is 1 and 5');
        } finally {
          cli.download.concurrency = 5;
        }
        done();
      });
    });
  });

  it('画像のBufferがsuccessイベントに送られる', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      cli.download
      .on('success', function (url, buffer) {
        var img = helper.url('img', '') + '/img/cat.png';
        var expected = helper.readBuffer('fixtures/img/img/cat.png');
        assert(url === img);
        assert.deepEqual(buffer, expected);
        assert.deepEqual(this.state, { queue: 0, complete: 1 });
        done();
      })
      .on('fail', function (e) {
        throw e;
      });
      assert($('.rel').download() === 1);
    });
  });

  it('Base64エンコードされた画像 => Buffer化される', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      cli.download
      .on('success', function (url, buffer) {
        var expected = helper.readBuffer('fixtures/img/img/sports.jpg');
        assert(url === 'base64');
        assert.deepEqual(buffer, expected);
        assert.deepEqual(this.state, { queue: 0, complete: 1 });
        done();
      })
      .on('fail', function (e) {
        throw e;
      });
      assert($('.base64').download() === 1);
    });
  });

  it('画像要素なし => ダウンロードキューに登録されない', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      assert($('.xxxxyyyyzzzz').download() === 0);
      done();
    });
  });

  it('javascript => ダウンロードキューに登録されない', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      assert($('.js').download() === 0);
      done();
    });
  });

  it('404 => failイベントに送られる', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      cli.download
      .on('success', function (url, buffer) {
        throw new Error('not thrown');
      })
      .on('fail', function (e) {
        var img = helper.url('img', '') + '/not-found.gif';
        assert(e.url === img);
        assert(e.message === 'server status');
        assert.deepEqual(this.state, { queue: 0, complete: 1 });
        done();
      });
      assert($('.err404').download() === 1);
    });
  });

  it('タイムアウト => failイベントに送られる', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      cli.download
      .on('success', function (url, buffer) {
        throw new Error('not thrown');
      })
      .on('fail', function (e) {
        var img = helper.url('img', '') + '/img/cat.png';
        assert(e.url === img);
        assert(e.message === 'ETIMEDOUT');
        assert.deepEqual(this.state, { queue: 0, complete: 1 });
        done();
      });
      cli.timeout = 1;
      assert($('.rel').download() === 1);
    });
  });

  it('ダウンロードが完了するまではqueueにカウントされている', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      var expected = [
        { queue: 1, complete: 1 },
        { queue: 0, complete: 2 }
      ];
      var eIdx = 0;
      cli.download
      .on('success', function (url, buffer) {
        var st = expected[eIdx++];
        assert.deepEqual(this.state, { queue: st.queue, complete: st.complete });
        if (eIdx === expected.length) {
          return done();
        }
      })
      .on('fail', function (e) {
        throw e;
      });
      $('.root').attr('src', $('.root').attr('src') + '&wait=1000');
      assert($('.root').download() === 1);
      assert($('.rel').download() === 1);
    });
  });

  describe('srcAttrs', function () {
    it('無指定 => デフォルトの優先順で属性を検索してダウンロード', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var expected = {
          url: helper.url('img', '') + '/img/cat.png',
          buffer: helper.readBuffer('fixtures/img/img/cat.png')
        };
        cli.download
        .on('success', function (url, buffer) {
          var actual = { url: url, buffer: buffer };
          assert.deepEqual(actual, expected);
          done();
        })
        .on('fail', function (e) {
          throw e;
        });
        assert($('.lazy1').download() === 1);
      });
    });

    it('文字列 => 指定した文字列属性をsrcよりも優先してダウンロード', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var expected = {
          url: helper.url('img', '') + '/img/sports.jpg',
          buffer: helper.readBuffer('fixtures/img/img/sports.jpg')
        };
        cli.download
        .on('success', function (url, buffer) {
          var actual = { url: url, buffer: buffer };
          assert.deepEqual(actual, expected);
          done();
        })
        .on('fail', function (e) {
          throw e;
        });
        assert($('.lazy3').download('data-original-src') === 1);
      });
    });

    it('空配列 => srcのURLをダウンロード', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var expected = {
          url: helper.url('img', '') + '/img/1x1.gif',
          buffer: helper.readBuffer('fixtures/img/img/1x1.gif')
        };
        cli.download
        .on('success', function (url, buffer) {
          var actual = { url: url, buffer: buffer };
          assert.deepEqual(actual, expected);
          done();
        })
        .on('fail', function (e) {
          throw e;
        });
        assert($('.lazy2').download([]) === 1);
      });
    });
  });
});

/*eslint-env mocha*/
/*eslint no-invalid-this:0, max-nested-callbacks:[1, 6]*/
/*jshint -W100*/
var assert   = require('power-assert');
var helper   = require('./_helper');
var cli      = require('../index');
var isSteram = require('isstream');
var devNull  = require('dev-null');

describe('cheerio:download', function () {
  beforeEach(function () {
    cli.download.state = { queue: 0, complete: 0, error: 0 };
    cli.download.removeAllListeners();
    cli.download.clearCache();
    cli.download.on('ready', function () {});
  });
  afterEach(function () {
    cli.set('timeout', 30000);
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
    after(function () {
      cli.download.parallel = 3;
    });

    it('1未満', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        try {
          cli.download.parallel = 0;
          $('.rel').download();
          throw new Error('not thrown');
        } catch (e) {
          assert(e.message === 'valid download parallel range is 1 and 5');
        }
        done();
      });
    });

    it('6以上', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        try {
          cli.download.parallel = 6;
          $('.rel').download();
          throw new Error('not thrown');
        } catch (e) {
          assert(e.message === 'valid download parallel range is 1 and 5');
        }
        done();
      });
    });
  });

  describe('URL登録', function () {
    it('二重登録不可', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        $('.rel').download();
        setTimeout(function () {
          $('.rel').download();
          setTimeout(function () {
            assert.deepEqual(cli.download.state, { queue: 0, complete: 1, error: 0 });
            done();
          }, 100);
        }, 100);
      });
    });

    it('clearCahce()後は再度登録可能', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        $('.rel').download();
        setTimeout(function () {
          cli.download.clearCache();
          $('.rel').download();
          setTimeout(function () {
            assert.deepEqual(cli.download.state, { queue: 0, complete: 2, error: 0 });
            done();
          }, 100);
        }, 100);
      });
    });
  });

  it('画像のStreamがreadyイベントに送られる', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      cli.download
      .on('ready', function (stream) {
        var img = helper.url('img') + '/img/cat.png';
        assert(stream.url.href === img);
        assert(stream.type === 'image/png');
        assert(stream.length === 15572);
        assert(isSteram(stream));
        stream.end();
        done();
      })
      .on('error', function (e) {
        throw e;
      });
      assert($('.rel').download() === 1);
    });
  });

  describe('stream.toBuffer()', function () {
    it('streamがBuffer化される', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        cli.download
        .on('ready', function (stream) {
          var img = helper.url('img') + '/img/cat.png';
          assert(stream.url.href === img);
          assert(stream.type === 'image/png');
          assert(stream.length === 15572);
          stream.toBuffer((function (err, buffer) {
            var expected = helper.readBuffer('fixtures/img/img/cat.png');
            assert.deepEqual(buffer, expected);
            assert.deepEqual(this.state, { queue: 0, complete: 1, error: 0 });
            done();
          }).bind(this));
        })
        .on('error', function (e) {
          throw e;
        });
        assert($('.rel').download() === 1);
      });
    });

    it('stream使用後に実行 => 例外', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        cli.download
        .on('ready', function (stream) {
          stream.pipe(devNull());
          try {
            stream.toBuffer(function (err, buffer) {
              throw new Error('not thrown');
            });
          } catch (e) {
            assert(e.message === 'stream has already been read');
          }
          done();
        })
        .on('error', function (e) {
          throw e;
        });
        assert($('.rel').download() === 1);
      });
    });

    it('コールバック未設定 => 例外', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        cli.download
        .on('ready', function (stream) {
          stream.pipe(devNull());
          try {
            return stream.toBuffer();
          } catch (e) {
            assert(e.message === 'callback is not function');
            return done();
          }
        })
        .on('error', function (e) {
          throw e;
        });
        assert($('.rel').download() === 1);
      });
    });
  });

  it('Base64エンコードされた画像 => Buffer化される', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      cli.download
      .on('ready', function (stream) {
        assert(isSteram(stream));
        stream.toBuffer((function (err, buffer) {
          var expected = helper.readBuffer('fixtures/img/img/sports.jpg');
          assert(stream.url === 'base64');
          assert(stream.type === 'image/jpg');
          assert(stream.length === 2268);
          assert.deepEqual(buffer, expected);
          assert.deepEqual(this.state, { queue: 0, complete: 1, error: 0 });
          done();
        }).bind(this));
      })
      .on('error', function (e) {
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

  it('404 => errorイベントに送られる', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      cli.download
      .on('ready', function (stream) {
        stream.end();
        throw new Error('not thrown');
      })
      .on('error', function (e) {
        var img = helper.url('img') + '/not-found.gif';
        assert(e.url === img);
        assert(e.message === 'server status');
        assert.deepEqual(this.state, { queue: 0, complete: 0, error: 1 });
        done();
      });
      assert($('.err404').download() === 1);
    });
  });

  it('リクエストタイムアウト => errorイベントに送られる', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      cli.download
      .on('ready', function (stream) {
        stream.end();
        throw new Error('not thrown');
      })
      .on('error', function (e) {
        var img = helper.url('img') + '/img/cat.png';
        assert(e.url === img);
        assert(helper.isTimedOut(e));
        assert.deepEqual(this.state, { queue: 0, complete: 0, error: 1 });
        done();
      });
      cli.set('timeout', 1);
      assert($('.rel').download() === 1);
    });
  });

  it('streamを使用しないままタイムアウト時間が過ぎるとエラー', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      cli.download
      .on('ready', function (stream) {
      })
      .on('error', function (e) {
        var img = helper.url('img') + '/~mega';
        assert(e.url === img);
        assert(e.message === 'stream timeout (maybe stream is not used)');
        assert.deepEqual(this.state, { queue: 0, complete: 0, error: 1 });
        done();
      });
      cli.set('timeout', 3000);
      assert($('.mega').download() === 1);
    });
  });

  it('ダウンロードが完了するまではqueueにカウントされている', function (done) {
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      var expected = [
        { queue: 1, complete: 1, error: 0 },
        { queue: 0, complete: 2, error: 0 }
      ];
      var eIdx = 0;
      cli.download
      .on('ready', function (stream) {
        stream.toBuffer((function (err, buffer) {
          var st = expected[eIdx++];
          assert.deepEqual(this.state, st);
          if (eIdx === expected.length) {
            return done();
          }
          /*eslint-disable consistent-return*/ return; /*eslint-enable consistent-return*/
        }).bind(this));
      })
      .on('error', function (e) {
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
          url: helper.url('img') + '/img/cat.png',
          buffer: helper.readBuffer('fixtures/img/img/cat.png')
        };
        cli.download
        .on('ready', function (stream) {
          stream.toBuffer(function (err, buffer) {
            var actual = { url: stream.url.href, buffer: buffer };
            assert.deepEqual(actual, expected);
            done();
          });
        })
        .on('error', function (e) {
          throw e;
        });
        assert($('.lazy1').download() === 1);
      });
    });

    it('文字列 => 指定した文字列属性をsrcよりも優先してダウンロード', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var expected = {
          url: helper.url('img') + '/img/sports.jpg',
          buffer: helper.readBuffer('fixtures/img/img/sports.jpg')
        };
        cli.download
        .on('ready', function (stream) {
          assert(stream.type === 'image/jpeg');
          assert(stream.length === 2268);
          stream.toBuffer(function (err, buffer) {
            var actual = { url: stream.url.href, buffer: buffer };
            assert.deepEqual(actual, expected);
            done();
          });
        })
        .on('error', function (e) {
          throw e;
        });
        assert($('.lazy3').download('data-original-src') === 1);
      });
    });

    it('空配列 => srcのURLをダウンロード', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var expected = {
          url: helper.url('img') + '/img/1x1.gif',
          buffer: helper.readBuffer('fixtures/img/img/1x1.gif')
        };
        cli.download
        .on('ready', function (stream) {
          assert(stream.type === 'image/gif');
          assert(stream.length === 37);
          stream.toBuffer(function (err, buffer) {
            var actual = { url: stream.url.href, buffer: buffer };
            assert.deepEqual(actual, expected);
            done();
          });
        })
        .on('error', function (e) {
          throw e;
        });
        assert($('.lazy2').download([]) === 1);
      });
    });
  });

  it('ダウンロードマネージャー未設定', function (done) {
    cli.download.removeAllListeners('ready');
    cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
      try {
        $('.rel').download();
        throw new Error('not thrown');
      } catch (e) {
        assert(e.message === 'download manager configured no event');
      }
      done();
    });
  });
});

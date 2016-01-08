/*eslint no-invalid-this:0, no-undefined:0*/
'use strict';

var util   = require('util');
var events = require('events');
var stream = require('stream');
var async  = require('async');
var assign = require('object-assign');
var cutil  = require('./util');

module.exports = function (encoding, client, cheerio) {
  var urlCache = [];

  /**
   * ダウンロードイベント管理用クラス
   *
   * すべてのダウンロード結果はこのクラスにemit()される
   * - success: ダウンロード完了時(url, buffer)
   * - error:   ダウンロード失敗時(error)
   */
  var DownloadEvent = (function () {
    function DownloadEvent() {
      events.EventEmitter.call(this);
      this.parallel = 5;
      this.state = Object.freeze({
        queue: 0,     // ダウンロードキューに残っている順番待ち画像の数
        complete: 0,  // ダウンロードが完了した画像の数
        error: 0      // ダウンロードが失敗した画像の数
      });
    }
    util.inherits(DownloadEvent, events.EventEmitter);

    /**
     * URLキャッシュクリア
     */
    DownloadEvent.prototype.clearCache = function () {
      urlCache.length = 0;
    };

    return DownloadEvent;
  })();
  client.core.download = new DownloadEvent();


  /**
   * ダウンロードストリームクラス
   */
  var DownloadStream = (function () {
    function DownloadStream(res) {
      stream.PassThrough.call(this);
      if (res.request) {
        this.request = res.request;
        this.url = res.request.uri;
        // 完了時にrequestにイベント送信
        this.on('end', function () {
          this.request.emit('download.complete');
        });
      } else {
        this.url = 'base64';
      }
      this.type = res.headers['content-type'];
      this.length = Number(res.headers['content-length'] || -1);

      // タイムアウト時間を過ぎてもStreamの読み出しが行われていない場合は放置されているとみなす
      this.__timer = setTimeout((function () {
        if (! this.isUsed()) {
          clearTimeout(this.__timer);
          this.__timer = null;
          this.end();
          if (this.request) {
            this.request.abort();
          }
        }
      }).bind(this), client.core.timeout);
    }
    util.inherits(DownloadStream, stream.PassThrough);

    /**
     * Stream => Buffer
     *
     * @param cb 変換後のBufferを受け取るコールバック関数(err, buffer)
     */
    DownloadStream.prototype.toBuffer = function (cb) {
      if (! (cb instanceof Function)) {
        throw new Error('callback is not function');
      }
      if (this.isUsed()) {
        throw new Error('stream has already been read');
      }

      var buffer = [];
      this.on('data', function (chunk) {
        buffer.push(chunk);
      });
      this.on('error', function (err) {
        cb.call(this, err);
      });
      this.on('end', function () {
        cb.call(this, null, Buffer.concat(buffer));
      });
    };

    /**
     * Streamの読み出しが開始されたかどうか(endEmitted or on('data')/pipe()が使用された形跡でチェック)
     *
     * @return true: 開始された
     */
    DownloadStream.prototype.isUsed = function () {
      var state = this._readableState;
      return (state.endEmitted || state.pipesCount > 0 || this.listeners('data').length > 0);
    };

    /**
     * 手動でend()が呼ばれた場合はスキップ扱いにする
     */
    DownloadStream.prototype.end = function () {
      if (! this.__timer) {
        return null;
      }
      clearTimeout(this.__timer);
      this.__timer = null;
      if (! this.isUsed()) {
        this.__skipped = true;
        if (this.request) {
          return this.request.abort();
        }
      }
      this.emit('end');
    };

    return DownloadStream;
  })();


  /**
   * イベント管理用クラスカウントを更新
   */
  function updateState(counts) {
    client.core.download.state = Object.freeze(
      assign({}, client.core.download.state, counts)
    );
  }


  /**
   * ダウンロード統括管理用クラス
   */
  var DownloadManager = (function () {
    var jobRunning = false;

    /**
     * ダウンロードループ実行
     */
    function downloadJob(manager) {
      // 実行フラグON
      jobRunning = true;

      // 現在キューに入っている分を全部切り出して一時キューに移動
      var qLen = manager.queue.length;
      var tmp = {
        queue: manager.queue.splice(0, qLen),
        complete: 0,
        error: 0,
        skip: 0,
        applyState: function (url, complete, error, skip) {
          // 一時キューの処理状況をダウンロードマネージャーに反映させる
          this.complete += complete;
          this.error += error;
          this.skip += skip;
          updateState({
            complete: client.core.download.state.complete + complete,
            error: client.core.download.state.error + error,
            queue: manager.queue.length + this.queue.length - this.complete - this.error - this.skip
          });
        }
      };

      // 一時キュー内のURLを順番にダウンロード(同時処理数: parallel)
      async.eachLimit(tmp.queue, manager.parallel, function (url, next) {
        var req = null;    // リクエストオブジェクト
        var strm = null;   // ダウンロードストリームオブジェクト

        // 二重処理防止
        var called = {
          abort: false,
          error: false,
          skip: false
        };

        // 失敗時の処理
        var on = {
          error: function (err) {
            // errorとskipのどちらが先に来るかよく分からない(不定?)
            if (called.skip || called.error) {
              return null;
            }
            called.error = true;
            called.skip = true;
            if (! err) {
              err = new Error('stream timeout (maybe stream is not used)');
            }
            tmp.applyState(url, 0, 1, 0);
            err.url = url;
            client.core.download.emit('error', err);
            if (! called.abort) {
              called.abort = true;
              req.abort();
            }
            return next();
          },
          skip: function () {
            // errorとskipのどちらが先に来るかよく分からない(不定?)
            if (called.skip || called.error) {
              return null;
            }
            called.error = true;
            called.skip = true;
            tmp.applyState(url, 0, 0, 1);
            return next();
          }
        };

        // ストリームで取得する場合はgzipにしない
        var options = client.prepare('GET', url, {}, null);
        options.param.gzip = false;
        try {
          req = client.request(options.param);
        } catch (e) {
          return on.error(e);
        }

        req
        .on('response', function (res) {
          if (String(res.statusCode).substr(0, 2) !== '20') {
            var err = new Error('server status');
            err.statusCode = res.statusCode;
            return on.error(err);
          }

          // ダウンロードストリームオブジェクトを作成してレスポンスを流し込む
          strm = new DownloadStream(res);
          client.core.download.emit('ready', strm);
          req.pipe(strm);
        })
        .on('error', function (err) {
          return on.error(err);
        })
        .on('abort', function () {
          called.abort = true;
          if (! strm) {
            // リクエスト自体のエラーはerrorイベントがこの後発生するのでここでは処理しない
            return null;
          }

          return on[(strm.__skipped) ? 'skip' : 'error']();
        })
        .on('download.complete', function () {
          if (strm.__skipped) {
            return on.skip();
          }

          if (! strm.isUsed()) {
            return on.error();
          }

          // 正常終了
          if (! called.skip && ! called.error) {
            tmp.applyState(url, 1, 0, 0);
            return next();
          }
        });
      }, function (err) {
        // 現在のダウンロード中にキューに追加されているURLがあるかもしれないので
        // 再度loopイベントを飛ばしておく
        jobRunning = false;
        manager.emit('loop');
      });
    }

    function DownloadManager() {
      this.queue = [];       // ダウンロード待ちURL配列

      this.on('loop', (function () {
        if (! jobRunning && this.queue.length > 0) {
          downloadJob(this);
        }
      }).bind(this));
    }
    util.inherits(DownloadManager, events.EventEmitter);

    /**
     * ダウンロードキューにURLを追加
     *
     * @param url ダウンロードするURL
     * @return    true: キューに登録された
     */
    DownloadManager.prototype.addQueue = function (url) {
      if (! url) {
        return false;
      }
      if (cutil.inArray(urlCache, url)) {
        // 登録/ダウンロード済み
        return false;
      }
      urlCache.push(url);
      process.nextTick((function () {
        this.queue.push(url);
        this.emit('loop');
      }).bind(this));
      return true;
    };

    return DownloadManager;
  })();
  var manager = new DownloadManager();


  /**
   * img要素の画像をダウンロード
   *
   * @param srcAttrs  (imgのみ)srcよりも優先して取得する属性名(文字列 or 配列)
   * @return キューに登録した数
   */
  cheerio.prototype.download = function (srcAttrs) {
    var doc = cutil.documentInfo(this);
    var $ = cheerio;

    // 最初に全要素がimg要素かどうかチェック
    this.each(function () {
      if (! $(this).is('img')) {
        throw new Error('element is not img');
      }
    });

    // 同時実行数チェック
    var parallel = parseInt(client.core.download.parallel, 10);
    if (parallel < 0 || parallel > 5) {
      throw new Error('valid download parallel range is 1 and 5');
    }
    manager.parallel = parallel;

    var queued = 0;
    this.each(function () {
      var $elem = $(this);

      // ここの$はfetch()を経由していないので_documentInfoがない
      if (! $elem._root) {
        $elem._root = { 0: { _documentInfo: doc } };
      }

      // Base64埋め込み画像の場合はBuffer化して即返す
      var b64chk = $elem.attr('src').match(/^data:(image\/\w+);base64,([\s\S]+)$/i);
      if (b64chk) {
        updateState({
          complete: client.core.download.state.complete + 1
        });
        var b64buf = new Buffer(b64chk[2], 'base64');
        var strm = new DownloadStream({
          headers: {
            'content-type': b64chk[1],
            'content-length': b64buf.length
          }
        });
        client.core.download.emit('ready', strm);
        strm.write(b64buf);
        strm.end();
        queued++;
        return;
      }

      var url = $elem.url({ invalid: false }, srcAttrs);
      if (manager.addQueue(url)) {
        queued++;
      }
    });

    return queued;
  };
};

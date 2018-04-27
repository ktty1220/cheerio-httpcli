/*eslint no-invalid-this:0*/
/*jshint -W100*/

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
      this.parallel = 3;
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

  var downloadEvent = new DownloadEvent();
  Object.defineProperty(client.core, 'download', {
    enumerable: true,
    get: function () {
      return downloadEvent;
    }
  });


  /**
   * ダウンロードストリームクラス
   */
  var DownloadStream = (function () {
    function DownloadStream(res) {
      stream.PassThrough.call(this);
      this.url = (res.request) ? res.request.uri : 'base64';
      this.type = res.headers['content-type'];
      this.length = Number(res.headers['content-length'] || -1);

      // タイムアウト時間を過ぎてもStreamの読み出しが行われていない場合は放置されているとみなす
      this.__timer = setTimeout((function () {
        if (! this.isUsed()) {
          clearTimeout(this.__timer);
          this.__timer = null;
          this.emit('error', new Error('stream timeout (maybe stream is not used)'));
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
     * Streamの読み出しが開始されたかどうか(on('data')/pipe()が使用された形跡でチェック)
     *
     * @return true: 開始された
     */
    DownloadStream.prototype.isUsed = function () {
      return (this._readableState.pipesCount > 0 || this.listeners('data').length > 0);
    };

    /**
     * 手動でend()が呼ばれた場合はスキップ扱いにする
     */
    DownloadStream.prototype.end = function () {
      if (! this.__timer) {
        return;
      }
      clearTimeout(this.__timer);
      this.__timer = null;
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
        applyState: function (complete, error) {
          // 一時キューの処理状況をダウンロードマネージャーに反映させる
          this.complete += complete;
          this.error += error;
          updateState({
            complete: client.core.download.state.complete + complete,
            error: client.core.download.state.error + error,
            queue: manager.queue.length + this.queue.length - this.complete - this.error
          });
        }
      };

      // 一時キュー内のURLを順番にダウンロード(同時処理数: parallel)
      async.eachLimit(tmp.queue, manager.parallel, function (url, next) {
        var req = null;    // リクエストオブジェクト
        var strm = null;   // ダウンロードストリームオブジェクト

        // 失敗時の処理
        var onError = function (err) {
          tmp.applyState(0, 1);
          err.url = url;
          client.core.download.emit('error', err);
          req.abort();
          next();
          return;
        };

        // ストリームで取得する場合はgzipにしない
        var options = client.prepare('GET', url, {}, null);
        options.param.gzip = false;
        try {
          req = client.request(options.param);
        } catch (e) {
          e.type = 'Request Exception';
          onError(e);
          return;
        }

        req
        .on('response', function (res) {
          if (String(res.statusCode).substr(0, 2) !== '20') {
            var err = new Error('server status');
            err.statusCode = res.statusCode;
            err.type = 'Invalid Response';
            onError(err);
            return;
          }

          // ダウンロードストリームオブジェクトを作成してレスポンスを流し込む
          strm = new DownloadStream(res);
          // ダウンロード完了時
          strm
          .on('end', function () {
            tmp.applyState(1, 0);
            req.abort();
            next();
          })
          .on('error', function (err) {
            err.type = 'Stream Error';
            onError(err);
          });

          client.core.download.emit('ready', strm);
          req.pipe(strm);
        })
        // 複数回発生するようなのでonce
        .once('error', function (err) {
          err.type = 'Request Error';
          return onError(err);
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
        if (jobRunning) {
          // 二重処理防止
          return;
        }

        if (this.queue.length > 0) {
          downloadJob(this);
        } else {
          client.core.download.emit('end');
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
    // ダウンロードマネージャーの設定がされていない
    if (client.core.download.listeners('ready').length === 0) {
      throw new Error('download manager configured no event');
    }

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
    if (parallel < 1 || parallel > 5) {
      throw new Error('valid download parallel range is 1 and 5');
    }
    manager.parallel = parallel;

    var queued = 0;
    this.each(function () {
      var $elem = $(this);

      // ここの$はfetch()を経由していないので_documentInfoがない
      if (! $elem._root) {
        $elem._root = {
          0: { _documentInfo: doc }
        };
      }

      // Base64埋め込み画像の場合はBuffer化して即返す
      var b64chk = ($elem.attr('src') || '').match(/^data:(image\/\w+);base64,([\s\S]+)$/i);
      if (b64chk) {
        updateState({
          complete: client.core.download.state.complete + 1
        });
        var b64buf = cutil.newBuffer(b64chk[2], 'base64');
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

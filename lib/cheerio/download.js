'use strict';

var fs = require('fs');
var path = require('path');
var util = require('util');
var events = require('events');
var stream = require('stream');
var async = require('async');
var assign = require('object-assign');
var RSVP = require('rsvp');
var tools = require('../tools');

module.exports = function (cheerio, Client) {
  var urlCache = [];
  var counts = {
    queue: 0, // ダウンロードキューに残っている順番待ち画像の数
    complete: 0, // ダウンロードが完了した画像の数
    error: 0 // ダウンロードが失敗した画像の数
  };
  var owner = Client.mainInstance;
  var cli = new Client(owner);

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
      Object.defineProperty(this, 'state', {
        enumerable: true,
        get: function () {
          return Object.freeze(assign({}, counts));
        }
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
  Object.defineProperty(owner, 'download', {
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
      this.url = res.request ? res.request.uri : 'base64';
      this.type = res.headers['content-type'];
      this.length = Number(res.headers['content-length'] || -1);

      // タイムアウト時間を過ぎてもStreamの読み出しが行われていない場合は放置されているとみなす
      this.__timer = setTimeout(
        function () {
          if (!this.isUsed()) {
            clearTimeout(this.__timer);
            this.__timer = null;
            this.emit('error', new Error('stream timeout (maybe stream is not used)'));
          }
        }.bind(this),
        owner.timeout
      );
    }
    util.inherits(DownloadStream, stream.PassThrough);

    /**
     * Stream => Buffer
     *
     * @param cb 変換後のBufferを受け取るコールバック関数(err, buffer)
     */
    DownloadStream.prototype.toBuffer = function (cb) {
      var promise = new RSVP.Promise(
        function (resolve, reject) {
          if (this.isUsed()) {
            reject(new Error('stream has already been read'));
          }

          var buffer = [];
          this.on('data', function (chunk) {
            try {
              buffer.push(chunk);
            } catch (e) {
              reject(e);
            }
          });
          this.on('end', function () {
            resolve(Buffer.concat(buffer));
          });
          this.on('error', reject);
        }.bind(this)
      );

      if (!cb) return promise;
      promise
        .then(function (buffer) {
          cb(null, buffer);
        })
        .catch(cb);
    };

    /**
     * Stream => iファイル保存
     *
     * @param filename 保存先ファイルパス
     * @param cb 変換後のBufferを受け取るコールバック関数(err)
     */
    DownloadStream.prototype.saveAs = function (filepath, cb) {
      var promise = new RSVP.Promise(
        function (resolve, reject) {
          if (!filepath) {
            reject(new Error('save filepath is not specified'));
          }
          // 保存先パスのディレクトリが書き込み可能かチェック
          fs.accessSync(path.dirname(filepath), fs.constants.R_OK | fs.constants.W_OK);

          if (this.isUsed()) {
            reject(new Error('stream has already been read'));
          }

          var buffer = [];
          this.on('data', function (chunk) {
            try {
              buffer.push(chunk);
            } catch (e) {
              reject(e);
            }
          });
          this.on('end', function () {
            fs.writeFile(filepath, Buffer.concat(buffer), function (err) {
              if (err) return reject(err);
              resolve();
            });
          });
          this.on('error', reject);
        }.bind(this)
      );

      if (!cb) return promise;
      promise.then(cb).catch(cb);
    };

    /**
     * Streamの読み出しが開始されたかどうか(on('data')/pipe()が使用された形跡でチェック)
     *
     * @return true: 開始された
     */
    DownloadStream.prototype.isUsed = function () {
      return this._readableState.pipesCount > 0 || this.listeners('data').length > 0;
    };

    /**
     * 手動でend()が呼ばれた場合はスキップ扱いにする
     */
    DownloadStream.prototype.end = function () {
      if (!this.__timer) return;
      clearTimeout(this.__timer);
      this.__timer = null;
      this.emit('end');
    };

    return DownloadStream;
  })();

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
      var tmp = {
        queue: manager.queue.splice(0, manager.queue.length),
        applyState: function (complete, error) {
          // 一時キューの処理状況をダウンロードマネージャーに反映させる
          counts.complete += complete;
          counts.error += error;
          counts.queue -= complete + error;
        }
      };

      // 一時キュー内のURLを順番にダウンロード(同時処理数: parallel)
      async.eachLimit(
        tmp.queue,
        manager.parallel,
        function (url, next) {
          var req = null; // リクエストオブジェクト
          var strm = null; // ダウンロードストリームオブジェクト

          // 失敗時の処理
          var onError = function (err) {
            tmp.applyState(0, 1);
            err.url = url;
            owner.download.emit('error', err);
            req.abort();
            next();
          };

          // ストリームで取得する場合はgzipにしない
          var options = cli.prepare('GET', url, {}, null);
          options.param.gzip = false;
          try {
            req = cli.request(options.param);
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
                  next();
                })
                .on('error', function (err) {
                  err.type = 'Stream Error';
                  this.destroy();
                  onError(err);
                });

              owner.download.emit('ready', strm);
              req.pipe(strm);
            })
            // 複数回発生するようなのでonce
            .once('error', function (err) {
              err.type = 'Request Error';
              return onError(err);
            });
        },
        function (err) {
          if (err) {
            console.error(err);
          }
          // 現在のダウンロード中にキューに追加されているURLがあるかもしれないので
          // 再度loopイベントを飛ばしておく
          jobRunning = false;
          manager.emit('loop');
        }
      );
    }

    function DownloadManager() {
      this.queue = []; // ダウンロード待ちURL配列

      this.on(
        'loop',
        function () {
          if (jobRunning) {
            // 二重処理防止
            return;
          }

          if (this.queue.length > 0) {
            downloadJob(this);
          } else {
            owner.download.emit('end');
          }
        }.bind(this)
      );
    }
    util.inherits(DownloadManager, events.EventEmitter);

    /**
     * ダウンロードキューにURLを追加
     *
     * @param url ダウンロードするURL
     * @return    true: キューに登録された
     */
    DownloadManager.prototype.addQueue = function (url) {
      if (!url) {
        return false;
      }
      if (tools.inArray(urlCache, url)) {
        // 登録/ダウンロード済み
        return false;
      }
      urlCache.push(url);
      process.nextTick(
        function () {
          this.queue.push(url);
          counts.queue++;
          owner.download.emit('add', url);
          this.emit('loop');
        }.bind(this)
      );
      return true;
    };

    /**
     * ダウンロード稼働中かどうか
     *
     * @return    true: 稼働中
     */
    DownloadManager.prototype.isRunning = function () {
      return jobRunning;
    };

    return DownloadManager;
  })();
  var manager = new DownloadManager();

  /**
   * img要素の画像をダウンロード
   *
   * @param srcAttrs  (imgのみ)srcよりも優先して取得する属性名(文字列 or 配列)
   *                  aの場合は無視される(href固定)
   * @return キューに登録した数
   */
  cheerio.prototype.download = function (srcAttrs) {
    // ダウンロードマネージャーの設定がされていない
    if (owner.download.listeners('ready').length === 0) {
      throw new Error('download manager configured no event');
    }

    var doc = tools.documentInfo(this);
    var $ = cheerio;

    // 最初に全要素がimg要素かどうかチェック
    if (
      this.filter(function () {
        return !$(this).is('img, a');
      }).length > 0
    ) {
      throw new Error('element is neither a link nor img');
    }

    // 同時実行数チェック
    var parallel = parseInt(owner.download.parallel, 10);
    if (parallel < 1 || parallel > 5) {
      throw new Error('valid download parallel range is 1 and 5');
    }
    manager.parallel = parallel;

    var queued = 0;
    this.each(function () {
      var $elem = $(this);

      // ここの$はfetch()を経由していないので_documentInfoがない
      if (!$elem._root) {
        $elem._root = {
          0: { _documentInfo: doc }
        };
      }

      // Base64埋め込み画像の場合はBuffer化して即返す
      var b64chk =
        $elem.is('img') && ($elem.attr('src') || '').match(/^data:(image\/\w+);base64,([\s\S]+)$/i);
      if (b64chk) {
        counts.complete++;
        var b64buf = tools.newBuffer(b64chk[2], 'base64');
        var strm = new DownloadStream({
          headers: {
            'content-type': b64chk[1],
            'content-length': b64buf.length
          }
        });
        owner.download.emit('ready', strm);
        strm.write(b64buf);
        strm.end();
        if (counts.queue === 0 && !manager.isRunning()) {
          owner.download.emit('end');
        }
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

/*eslint no-invalid-this:0, no-undefined:0*/
'use strict';

var util   = require('util');
var events = require('events');
var async  = require('async');
var assign = require('object-assign');
var cutil  = require('./util');

module.exports = function (encoding, client, cheerio) {
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
        queue: 0,    // ダウンロードキューに残っている順番待ち画像の数
        complete: 0  // ダウンロードが完了した画像の数
      });
    }
    util.inherits(DownloadEvent, events.EventEmitter);

    return DownloadEvent;
  })();
  client.core.download = new DownloadEvent();


  /**
   * ダウンロード統括管理用クラス
   */
  var DownloadManager = (function () {
    function DownloadManager() {
      this.queue = [];       // ダウンロード待ちURL配列
      this.running = false;  // ダウンロードJOBが二重に走らないためのフラグ

      this.on('loop', (function () {
        if (! this.running && this.queue.length > 0) {
          this.download();
        }
      }).bind(this));
    }
    util.inherits(DownloadManager, events.EventEmitter);

    /**
     * ダウンロードキューにURLを追加
     *
     * @param url ダウンロードするURL
     */
    DownloadManager.prototype.addQueue = function (url) {
      process.nextTick((function () {
        this.queue.push(url);
        this.emit('loop');
      }).bind(this));
    };

    /**
     * イベント管理用クラスカウントを更新
     */
    DownloadManager.prototype.updateState = function (counts) {
      client.core.download.state = Object.freeze(
        assign({}, client.core.download.state, counts)
      );
    };

    /**
     * ダウンロードループ実行
     */
    DownloadManager.prototype.download = function () {
      // 実行フラグON
      this.running = true;
      var _this = this;

      // 現在キューに入っている分を全部切り出して一時キューに移動
      var qLen = _this.queue.length;
      var tmpQueue = _this.queue.splice(0, qLen);
      var tmpComplete = 0;

      // 一時キュー内のURLを順番にダウンロード(同時処理数: parallel)
      async.eachLimit(tmpQueue, _this.parallel, function (url, next) {
        var options = client.prepare('GET', url, {}, null);
        client.request(options.param, options.gzip, function (err, res, body) {
          tmpComplete++;
          _this.updateState({
            complete: client.core.download.state.complete + 1,
            queue: _this.queue.length + tmpQueue.length - tmpComplete
          });

          if (! err && String(res.statusCode).substr(0, 2) !== '20') {
            err = new Error('server status');
          }

          if (err) {
            err.url = url;
            client.core.download.emit('fail', err);
          } else {
            client.core.download.emit('success', url, body);
          }

          return next();
        });
      }, function () {
        // 現在のダウンロード中にキューに追加されているURLがあるかもしれないので
        // 再度loopイベントを飛ばしておく
        _this.running = false;
        _this.emit('loop');
      });
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
      var b64chk = $elem.attr('src').match(/^data:image\/\w+;base64,([\s\S]+)$/i);
      if (b64chk) {
        manager.updateState({
          complete: client.core.download.state.complete + 1
        });
        client.core.download.emit('success', 'base64', new Buffer(b64chk[1], 'base64'));
        return;
      }

      var url = $elem.absoluteUrl({ invalid: false }, srcAttrs);
      if (url) {
        manager.addQueue(url);
        queued++;
      }
    });

    return queued;
  };
};

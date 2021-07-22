const helper = require('./_helper');
const cli = require('../index');
const path = require('path');
const fs = require('fs');
const typeOf = require('type-of');
const isSteram = require('isstream');
const assign = require('object-assign');
const devNull = require('dev-null');
const endpoint = helper.endpoint();
const imgIndex = `${endpoint}/img/index.html`;
const imgLocalDir = 'img/img';
const imgRemoteDir = `${endpoint}/${imgLocalDir}`;
const fileLocalDir = 'img/file';
const fileRemoteDir = `${endpoint}/${fileLocalDir}`;

describe('cheerio:download', () => {
  beforeEach(() => {
    cli.download.removeAllListeners();
    cli.download.clearCache();
    cli.download.on('ready', () => {});
  });
  afterEach(() => {
    cli.set('timeout', 30000);
  });

  test('ダウンロードマネージャー未設定', () => {
    return new Promise((resolve) => {
      cli.download.removeAllListeners('ready');
      cli.fetch(imgIndex, (err, $, res, body) => {
        expect(() => $('.rel').download()).toThrow('download manager configured no event');
        resolve();
      });
    });
  });

  test('a,img要素以外 => エラー', () => {
    return new Promise((resolve) => {
      cli.fetch(imgIndex, (err, $, res, body) => {
        expect(() => $('body').download()).toThrow('element is neither a link nor img');
        expect(() => $('div').download()).toThrow('element is neither a link nor img');
        resolve();
      });
    });
  });

  describe('同時実行数指定', () => {
    afterAll(() => {
      cli.download.parallel = 3;
    });

    test('1未満', () => {
      return new Promise((resolve) => {
        cli.fetch(imgIndex, (err, $, res, body) => {
          cli.download.parallel = 0;
          expect(() => $('.rel').download()).toThrow('valid download parallel range is 1 and 5');
          resolve();
        });
      });
    });

    test('6以上', () => {
      return new Promise((resolve) => {
        cli.fetch(imgIndex, (err, $, res, body) => {
          cli.download.parallel = 6;
          expect(() => $('.rel').download()).toThrow('valid download parallel range is 1 and 5');
          resolve();
        });
      });
    });
  });

  test('画像のStreamがreadyイベントに送られる', () => {
    return new Promise((resolve, reject) => {
      cli.download
        .on('ready', (stream) => {
          try {
            expect(stream.url.href).toStrictEqual(`${imgRemoteDir}/cat.png`);
            expect(stream.type).toStrictEqual('image/png');
            expect(stream).toHaveLength(15572);
            expect(isSteram(stream)).toStrictEqual(true);
            stream.end();
            resolve();
          } catch (e) {
            reject(e);
            stream.end();
          }
        })
        .on('error', reject);
      cli.fetch(imgIndex, (err, $, res, body) => {
        expect($('.rel').download()).toStrictEqual(1);
      });
    });
  });

  test('画像とリンクをまとめて登録 => いずれもダウンロードされる', () => {
    return new Promise((resolve, reject) => {
      const expected = assign({}, cli.download.state);
      expected.complete += 3;
      cli.download
        .on('ready', (stream) => {
          try {
            stream.end();
          } catch (e) {
            reject(e);
          }
        })
        .on('error', reject)
        .on('end', function () {
          expect(this.state).toStrictEqual(expected);
          resolve();
        });
      cli.fetch(imgIndex, (err, $, res, body) => {
        expect($('.rel,.zip,.txt').download()).toStrictEqual(3);
      });
    });
  });

  test('子インスタンスからdownloadを実行 => 親インスタンスのreadyイベントに送られる', () => {
    return new Promise((resolve, reject) => {
      cli.download
        .on('ready', (stream) => {
          try {
            expect(stream.url.href).toStrictEqual(`${imgRemoteDir}/cat.png`);
            expect(stream.type).toStrictEqual('image/png');
            expect(stream).toHaveLength(15572);
            expect(isSteram(stream)).toStrictEqual(true);
            stream.end();
            resolve();
          } catch (e) {
            reject(e);
          }
        })
        .on('error', reject);
      const child = cli.fork();
      child.fetch(imgIndex, (err, $, res, body) => {
        expect($('.rel').download()).toStrictEqual(1);
      });
    });
  });

  describe('stream.toBuffer()', () => {
    test('streamがBuffer化される', () => {
      return new Promise((resolve, reject) => {
        const expected = assign({}, cli.download.state);
        expected.complete++;
        cli.download
          .on('ready', (stream) => {
            try {
              expect(stream.url.href).toStrictEqual(`${imgRemoteDir}/cat.png`);
              expect(stream.type).toStrictEqual('image/png');
              expect(stream).toHaveLength(15572);
              expect(
                stream.toBuffer((err, buffer) => {
                  try {
                    expect(err).toBeNull();
                    expect(buffer).toStrictEqual(helper.readBuffer(`${imgLocalDir}/cat.png`));
                    expect(cli.download.state).toStrictEqual(expected);
                    resolve();
                  } catch (e) {
                    reject(e);
                    stream.end();
                  }
                })
              ).toBeUndefined();
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.rel').download()).toStrictEqual(1);
        });
      });
    });

    test('stream使用後に実行 => エラー', () => {
      return new Promise((resolve, reject) => {
        cli.download
          .on('ready', (stream) => {
            try {
              stream.pipe(devNull());
              stream.toBuffer((err, buffer) => {
                try {
                  expect(err).toBeDefined();
                  expect(err.message).toStrictEqual('stream has already been read');
                  expect(buffer).toBeUndefined();
                  resolve();
                  stream.end();
                } catch (e) {
                  reject(e);
                  stream.end();
                }
              });
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.rel').download()).toStrictEqual(1);
        });
      });
    });

    test('コールバック未指定 => promiseオブジェクトを返す', () => {
      return new Promise((resolve, reject) => {
        const expected = assign({}, cli.download.state);
        expected.complete++;
        cli.download
          .on('ready', (stream) => {
            try {
              const promise = stream.toBuffer();
              expect(typeOf(promise)).toStrictEqual('object');
              expect(typeOf(promise.then)).toStrictEqual('function');
              expect(typeOf(promise.catch)).toStrictEqual('function');
              expect(typeOf(promise.finally)).toStrictEqual('function');
              promise
                .then((buffer) => {
                  expect(buffer).toStrictEqual(helper.readBuffer(`${fileLocalDir}/foobarbaz.zip`));
                  expect(cli.download.state).toStrictEqual(expected);
                  resolve();
                })
                .catch(reject);
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex).then(({ $ }) => {
          expect($('.zip').download()).toStrictEqual(1);
        });
      });
    });
  });

  test('Base64エンコードされた画像 => Buffer化される', () => {
    return new Promise((resolve, reject) => {
      const expected = assign({}, cli.download.state);
      expected.complete++;
      cli.download
        .on('ready', function (stream) {
          try {
            expect(stream.url).toStrictEqual('base64');
            expect(stream.type).toStrictEqual('image/jpg');
            expect(stream).toHaveLength(2268);
            expect(isSteram(stream)).toStrictEqual(true);
            stream.toBuffer((err, buffer) => {
              try {
                expect(buffer).toStrictEqual(helper.readBuffer(`${imgLocalDir}/sports.jpg`));
                expect(cli.download.state).toStrictEqual(expected);
                resolve();
              } catch (e) {
                reject(e);
                stream.end();
              }
            });
          } catch (e) {
            reject(e);
            stream.end();
          }
        })
        .on('error', reject);
      cli.fetch(imgIndex, (err, $, res, body) => {
        expect($('.base64').download()).toStrictEqual(1);
      });
    });
  });

  describe('stream.saveAs()', () => {
    const tmpFiles = [];
    const testFile = () => {
      const file = helper.tmppath();
      tmpFiles.push(file);
      return file;
    };

    afterAll(() => {
      tmpFiles.forEach((t) => {
        if (fs.existsSync(t)) {
          fs.unlinkSync(t);
        }
      });
    });

    test('streamがファイルに保存される', () => {
      return new Promise((resolve, reject) => {
        const expected = assign({}, cli.download.state);
        expected.complete++;
        cli.download
          .on('ready', (stream) => {
            try {
              const savePath = testFile();
              expect(
                stream.saveAs(savePath, (err) => {
                  try {
                    expect(err).toBeUndefined();
                    const actual = Buffer.from(fs.readFileSync(savePath));
                    expect(actual).toStrictEqual(helper.readBuffer(`${imgLocalDir}/cat.png`));
                    expect(cli.download.state).toStrictEqual(expected);
                    resolve();
                  } catch (e) {
                    reject(e);
                    stream.end();
                  }
                })
              ).toBeUndefined();
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.rel').download()).toStrictEqual(1);
        });
      });
    });

    test('コールバック未指定 => promiseオブジェクトを返す', () => {
      return new Promise((resolve, reject) => {
        const expected = assign({}, cli.download.state);
        expected.complete++;
        cli.download
          .on('ready', (stream) => {
            try {
              const savePath = testFile();
              const promise = stream.saveAs(savePath);
              expect(typeOf(promise)).toStrictEqual('object');
              expect(typeOf(promise.then)).toStrictEqual('function');
              expect(typeOf(promise.catch)).toStrictEqual('function');
              expect(typeOf(promise.finally)).toStrictEqual('function');
              promise
                .then(() => {
                  const actual = Buffer.from(fs.readFileSync(savePath));
                  expect(actual).toStrictEqual(helper.readBuffer(`${fileLocalDir}/foobarbaz.zip`));
                  expect(cli.download.state).toStrictEqual(expected);
                  resolve();
                })
                .catch(reject);
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.zip').download()).toStrictEqual(1);
        });
      });
    });

    test('Base64エンコードされた画像 => Buffer化してファイルに保存される', () => {
      return new Promise((resolve, reject) => {
        const expected = assign({}, cli.download.state);
        expected.complete++;
        cli.download
          .on('ready', function (stream) {
            try {
              const savePath = testFile();
              stream.saveAs(savePath, (err) => {
                try {
                  const actual = Buffer.from(fs.readFileSync(savePath));
                  expect(actual).toStrictEqual(helper.readBuffer(`${imgLocalDir}/sports.jpg`));
                  expect(cli.download.state).toStrictEqual(expected);
                  resolve();
                } catch (e) {
                  reject(e);
                  stream.end();
                }
              });
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.base64').download()).toStrictEqual(1);
        });
      });
    });

    test('ファイル名未指定 => エラー', () => {
      return new Promise((resolve, reject) => {
        cli.download
          .on('ready', async (stream) => {
            try {
              await expect(stream.saveAs()).rejects.toThrow('save filepath is not specified');
              stream.end();
              resolve();
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.rel').download()).toStrictEqual(1);
        });
      });
    });

    test('存在しないパス => エラー', async () => {
      return new Promise((resolve, reject) => {
        cli.download
          .on('ready', (stream) => {
            try {
              const dummyDir = path.join(__dirname, '!!not_exists!!');
              const dummyPath = path.join(dummyDir, 'foobarbaz.zip');
              stream.saveAs(dummyPath, (err) => {
                try {
                  expect(err).toBeDefined();
                  expect(err.message).toStrictEqual(
                    `ENOENT: no such file or directory, access '${dummyDir}'`
                  );
                  resolve();
                } catch (e) {
                  reject(e);
                  stream.end();
                }
              });
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.zip').download()).toStrictEqual(1);
        });
      });
    });

    test('stream使用後に実行 => エラー', () => {
      return new Promise((resolve, reject) => {
        cli.download
          .on('ready', (stream) => {
            stream.on('data', async (data) => {
              try {
                const savePath = testFile();
                await expect(stream.saveAs(savePath)).rejects.toThrow(
                  'stream has already been read'
                );
                resolve();
                stream.end();
              } catch (e) {
                reject(e);
                stream.end();
              }
            });
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.rel').download()).toStrictEqual(1);
        });
      });
    });

    test('すでにファイルが存在 => 上書き', () => {
      return new Promise((resolve, reject) => {
        const expected = assign({}, cli.download.state);
        expected.complete++;
        cli.download
          .on('ready', (stream) => {
            try {
              const savePath = testFile();
              fs.writeFileSync(savePath, 'dummy');
              expect(fs.readFileSync(savePath, 'utf-8')).toStrictEqual('dummy');
              stream.saveAs(savePath, (err) => {
                try {
                  expect(err).toBeUndefined();
                  const actual = Buffer.from(fs.readFileSync(savePath));
                  expect(actual).toStrictEqual(helper.readBuffer(`${imgLocalDir}/cat.png`));
                  expect(cli.download.state).toStrictEqual(expected);
                  resolve();
                } catch (e) {
                  reject(e);
                  stream.end();
                }
              });
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.rel').download()).toStrictEqual(1);
        });
      });
    });
  });

  test('画像要素なし => ダウンロードキューに登録されない', () => {
    return new Promise((resolve) => {
      cli.fetch(imgIndex, (err, $, res, body) => {
        expect($('.xxxxyyyyzzzz').download()).toStrictEqual(0);
        resolve();
      });
    });
  });

  test('javascript => ダウンロードキューに登録されない', () => {
    return new Promise((resolve) => {
      cli.fetch(imgIndex, (err, $, res, body) => {
        expect($('.js').download()).toStrictEqual(0);
        resolve();
      });
    });
  });

  test('404 => errorイベントに送られる', () => {
    return new Promise((resolve, reject) => {
      const expected = assign({}, cli.download.state);
      expected.error++;
      cli.download
        .on('ready', (stream) => {
          stream.end();
          throw new Error('not thrown');
        })
        .on('error', function (e) {
          try {
            expect(e.url).toStrictEqual(`${endpoint}/img/not-found.gif`);
            expect(e.message).toStrictEqual('server status');
            expect(this.state).toStrictEqual(expected);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      cli.fetch(imgIndex, (err, $, res, body) => {
        expect($('.err404').download()).toStrictEqual(1);
      });
    });
  });

  test('リクエストタイムアウト => errorイベントに送られる', () => {
    return new Promise((resolve, reject) => {
      const expected = assign({}, cli.download.state);
      expected.error++;
      cli.download
        .on('ready', (stream) => {
          stream.end();
          throw new Error('not thrown');
        })
        .on('error', function (e) {
          try {
            expect(e.url).toStrictEqual(`${imgRemoteDir}/cat.png`);
            expect(helper.isTimedOut(e)).toStrictEqual(true);
            expect(this.state).toStrictEqual(expected);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      cli.fetch(imgIndex, (err, $, res, body) => {
        cli.set('timeout', 1);
        expect($('.rel').download()).toStrictEqual(1);
      });
    });
  });

  test('streamを使用しないままタイムアウト時間が過ぎるとエラー', () => {
    return new Promise((resolve, reject) => {
      const expected = assign({}, cli.download.state);
      expected.error++;
      cli.download
        .on('ready', (stream) => {})
        .on('error', function (e) {
          try {
            expect(e.url).toStrictEqual(`${endpoint}/img/~mega`);
            expect(e.message).toStrictEqual('stream timeout (maybe stream is not used)');
            expect(this.state).toStrictEqual(expected);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      cli.fetch(imgIndex, (err, $, res, body) => {
        cli.set('timeout', 3000);
        expect($('.mega').download()).toStrictEqual(1);
      });
    });
  });

  test('ダウンロードが完了するまではqueueにカウントされている', () => {
    return new Promise((resolve, reject) => {
      const state = assign({}, cli.download.state);
      let expected = null;
      cli.download
        .on('ready', function (stream) {
          try {
            stream.toBuffer((err, buffer) => {
              try {
                expect(this.state).toStrictEqual({
                  queue: state.queue,
                  complete: state.complete + 1,
                  error: state.error
                });
              } catch (e) {
                reject(e);
                stream.end();
              }
            });
          } catch (e) {
            reject(e);
            stream.end();
          }
        })
        .on('add', function (url) {
          try {
            expect(url).toStrictEqual(expected);
            expect(this.state).toStrictEqual({
              queue: state.queue + 1,
              complete: state.complete,
              error: state.error
            });
          } catch (e) {
            reject(e);
          }
        })
        .on('error', reject)
        .on('end', resolve);
      cli.fetch(imgIndex, (err, $, res, body) => {
        $('.root').attr('src', `${$('.root').attr('src')}&wait=1000`);
        expected = $('.root').url();
        expect($('.root').download()).toStrictEqual(1);
      });
    });
  });

  xdescribe('srcAttrs', () => {
    test('無指定 => デフォルトの優先順で属性を検索してダウンロード', () => {
      return new Promise((resolve, reject) => {
        const expected = {
          url: `${imgRemoteDir}/cat.png`,
          buffer: helper.readBuffer(`${imgLocalDir}/cat.png`)
        };
        cli.download
          .on('ready', (stream) => {
            try {
              stream.toBuffer((err, buffer) => {
                try {
                  expect({
                    url: stream.url.href,
                    buffer: buffer
                  }).toStrictEqual(expected);
                  resolve();
                } catch (e) {
                  reject(e);
                  stream.end();
                }
              });
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.lazy1').download()).toStrictEqual(1);
        });
      });
    });

    test('文字列 => 指定した文字列属性をsrcよりも優先してダウンロード', () => {
      return new Promise((resolve, reject) => {
        const expected = {
          url: `${imgRemoteDir}/sports.jpg`,
          buffer: helper.readBuffer(`${imgLocalDir}/sports.jpg`)
        };
        cli.download
          .on('ready', (stream) => {
            try {
              expect(stream.type).toStrictEqual('image/jpeg');
              expect(stream).toHaveLength(2268);
              stream
                .toBuffer()
                .then((buffer) => {
                  expect({
                    url: stream.url.href,
                    buffer: buffer
                  }).toStrictEqual(expected);
                  resolve();
                })
                .catch(reject);
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.lazy3').download('data-original-src')).toStrictEqual(1);
        });
      });
    });

    test('空配列 => srcのURLをダウンロード', () => {
      return new Promise((resolve, reject) => {
        const expected = {
          url: `${imgRemoteDir}/1x1.gif`,
          buffer: helper.readBuffer(`${imgLocalDir}/1x1.gif`)
        };
        cli.download
          .on('ready', (stream) => {
            try {
              expect(stream.type).toStrictEqual('image/gif');
              expect(stream).toHaveLength(37);
              stream
                .toBuffer()
                .then((buffer) => {
                  expect({
                    url: stream.url.href,
                    buffer: buffer
                  }).toStrictEqual(expected);
                  resolve();
                })
                .catch(reject);
            } catch (e) {
              reject(e);
              stream.end();
            }
          })
          .on('error', reject);
        cli.fetch(imgIndex, (err, $, res, body) => {
          expect($('.lazy2').download([])).toStrictEqual(1);
        });
      });
    });
  });

  describe('link', () => {
    [
      ['テキスト', 'foobarbaz.txt', 'text/plain', 9, '.txt'],
      ['zip', 'foobarbaz.zip', 'application/zip', 270, '.zip']
    ].forEach(([type, file, mime, size, sel]) => {
      test(`${type}ファイル => ファイルをダウンロード`, () => {
        return new Promise((resolve, reject) => {
          const expected = {
            url: `${fileRemoteDir}/${file}`,
            buffer: helper.readBuffer(`${fileLocalDir}/${file}`)
          };
          cli.download
            .on('ready', (stream) => {
              try {
                expect(stream.type).toStrictEqual(mime);
                expect(stream).toHaveLength(size);
                stream.toBuffer((err, buffer) => {
                  try {
                    expect({
                      url: stream.url.href,
                      buffer: buffer
                    }).toStrictEqual(expected);
                    resolve();
                  } catch (e) {
                    reject(e);
                    stream.end();
                  }
                });
              } catch (e) {
                reject(e);
                stream.end();
              }
            })
            .on('error', reject);
          cli.fetch(imgIndex, (err, $, res, body) => {
            expect($(sel).download()).toStrictEqual(1);
          });
        });
      });
    });
  });

  describe('URL登録', () => {
    test('二重登録不可', () => {
      return new Promise((resolve, reject) => {
        const state = assign({}, cli.download.state);
        const list = ['.rel', '.rel'];
        let added = 0;
        cli.fetch(imgIndex, (err, $, res, body) => {
          cli.download
            .on('add', () => {
              try {
                added++;
                if (list.length === 0) return;
                $(list.shift()).download();
              } catch (e) {
                reject(e);
              }
            })
            .on('end', function () {
              try {
                expect(added).toStrictEqual(1);
                expect(this.state).toStrictEqual({
                  queue: state.queue,
                  complete: state.complete + 1,
                  error: state.error
                });
                resolve();
              } catch (e) {
                reject(e);
              }
            })
            .on('error', reject);
          $(list.shift()).download();
        });
      });
    });

    test('clearCahce()後は再度登録可能', () => {
      return new Promise((resolve, reject) => {
        const state = assign({}, cli.download.state);
        const list = ['.rel', '.rel'];
        let added = 0;
        cli.fetch(imgIndex, (err, $, res, body) => {
          cli.download
            .on('add', function () {
              try {
                added++;
                this.clearCache();
                if (list.length === 0) return;
                $(list.shift()).download();
              } catch (e) {
                reject(e);
              }
            })
            .on('end', function () {
              try {
                expect(added).toStrictEqual(2);
                expect(this.state).toStrictEqual({
                  queue: state.queue,
                  complete: state.complete + 2,
                  error: state.error
                });
                resolve();
              } catch (e) {
                reject(e);
              }
            })
            .on('error', reject);
          $(list.shift()).download();
        });
      });
    });
  });
});

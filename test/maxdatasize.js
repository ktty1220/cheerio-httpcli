const helper = require('./_helper');
const cli = require('../index');
const endpoint = helper.endpoint();

describe('maxdatasize', () => {
  beforeAll(() => {
    cli.set('timeout', 30000);
  });

  test('デフォルトは受信無制限', () => {
    return new Promise((resolve, reject) => {
      cli.fetch(`${endpoint}/~mega`, (err, $, res, body) => {
        try {
          expect(err).toBeUndefined();
          expect(body.length).toStrictEqual(1024 * 1024);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  test('maxDataSizeを指定 => 指定したバイト数で受信制限がかかる', () => {
    return new Promise((resolve, reject) => {
      cli.set('maxDataSize', 1024 * 64);
      cli.fetch(`${endpoint}/~mega`, (err, $, res, body) => {
        try {
          expect(err.message).toStrictEqual('data size limit over');
          expect($).toBeUndefined();
          expect(res).toBeUndefined();
          expect(body).toBeUndefined();
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });
});

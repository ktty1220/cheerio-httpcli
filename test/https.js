/* eslint node/no-deprecated-api:off */
const typeOf = require('type-of');
const constants = require('constants');
const helper = require('./_helper');
const cli = require('../index');
const endpoint = `${helper.endpoint(true)}/~https`;

describe('https', () => {
  beforeEach(() => {
    cli.set(
      'agentOptions',
      {
        rejectUnauthorized: false
      },
      true
    );
  });

  test('agentOptions未設定 => TLS1.2 Onlyのサーバーに接続可能', () => {
    return new Promise((resolve) => {
      cli.fetch(endpoint, (err, $, res, body) => {
        expect(err).toBeUndefined();
        expect(typeOf(res)).toEqual('object');
        expect(typeOf($)).toEqual('function');
        expect(typeOf(body)).toEqual('string');
        expect(body).toEqual('hello https');
        resolve();
      });
    });
  });

  test('agentOptions: TLS1.2強制 => TLS1.2 Onlyのサーバーに接続可能', () => {
    return new Promise((resolve) => {
      cli.set('agentOptions', {
        secureProtocol: 'TLSv1_2_method'
      });
      cli.fetch(endpoint, (err, $, res, body) => {
        expect(err).toBeUndefined();
        expect(typeOf(res)).toEqual('object');
        expect(typeOf($)).toEqual('function');
        expect(typeOf(body)).toEqual('string');
        expect(body).toEqual('hello https');
        resolve();
      });
    });
  });

  test('agentOptions: TLS1.2強制 => httpのサーバーにも接続可能', () => {
    return new Promise((resolve) => {
      cli.set('agentOptions', {
        secureProtocol: 'TLSv1_2_method'
      });
      cli.fetch(`${endpoint}/~info`, (err, $, res, body) => {
        expect(err).toBeUndefined();
        expect(typeOf(res)).toEqual('object');
        expect(typeOf($)).toEqual('function');
        expect(typeOf(body)).toEqual('string');
        resolve();
      });
    });
  });

  test('agentOptions: TLS1.1強制 => TLS1.2 Onlyのサーバーに接続不可', () => {
    return new Promise((resolve) => {
      cli.set('agentOptions', {
        secureProtocol: 'TLSv1_1_method'
      });
      const url = endpoint;
      cli.fetch(url, (err, $, res, body) => {
        expect(err).toBeDefined();
        expect(err.code).toEqual('EPROTO');
        expect(err.message).toContain('SSL routines:');
        expect(err.url).toEqual(url);
        expect(res).toBeUndefined();
        expect($).toBeUndefined();
        expect(body).toBeUndefined();
        resolve();
      });
    });
  });

  test('agentOptions: TLS1.2無効 => TLS1.2 Onlyのサーバーに接続不可', () => {
    return new Promise((resolve) => {
      cli.set('agentOptions', {
        secureOptions: constants.SSL_OP_NO_TLSv1_2
      });
      const url = endpoint;
      cli.fetch(url, (err, $, res, body) => {
        expect(err.code).toEqual('EPROTO');
        expect(err.message).toContain('SSL routines:');
        expect(err.url).toEqual(url);
        expect(res).toBeUndefined();
        expect($).toBeUndefined();
        expect(body).toBeUndefined();
        resolve();
      });
    });
  });
});

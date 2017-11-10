import * as http from 'http';
import * as url from 'url';
import * as stream from 'stream';
//tslint:disable:next-line: no-import-side-effect
import 'cheerio';

// cheerio-httpcli本体
declare namespace CheerioHttpcli {
  interface FetchResponse extends http.IncomingMessage {
    cookies: {[ name: string ]: string};
  }

  // CheerioStatic拡張
  interface CheerioStaticEx extends CheerioStatic {
    documentInfo(): { url: string, encoding: string | null, isXml: boolean };
    entityHtml(options?: CheerioOptionsInterface): string;
    entityHtml(selector: string, options?: CheerioOptionsInterface): string;
    entityHtml(element: Cheerio, options?: CheerioOptionsInterface): string;
    entityHtml(element: CheerioElement, options?: CheerioOptionsInterface): string;
  }

  interface FetchResult {
    error: Error;
    $: CheerioStaticEx;
    response: FetchResponse;
    body: string;
  }
  type FetchCallback = (error: Error, $: CheerioStaticEx, response: FetchResponse, body: string) => void;

  // やっつけPromise
  interface Promise {
    then(callback: (result: FetchResult) => void): Promise;
    catch(callbck: (error: Error) => void): Promise;
    finally(callback: () => void): Promise;
  }

  namespace Download {
    interface Stream extends stream.Stream {
      url: url.Url;
      type: string;
      length: number;
      toBuffer(callback: (error: Error, buffer: Buffer) => void): void;
      end(): void;
    }
    interface ErrorEx extends Error {
      url: string;
    }

    export interface Manager {
      parallel: number;
      state: { queue: number, complete: number, error: number };
      clearCache(): void;
      on(event: 'ready', handler: ((stream: Stream) => void)): Manager;
      on(event: 'error', handler: ((error: ErrorEx) => void)): Manager;
      on(event: 'end', handler: (() => void)): Manager;
    }
  }

  type FreeObject = {[ name: string ]: string};
  const headers: FreeObject;
  const agentOptions: FreeObject;
  const timeout: number;
  const maxDataSize: number;
  const gzip: boolean;
  const referer: boolean;
  const followMetaRefresh: boolean;
  const forceHtml: boolean;
  const debug: boolean;
  const browser: string;
  const iconv: string;
  const version: string;
  const download: Download.Manager;

  function reset(): void;

  function set(name: 'browser' | 'iconv', value: string): void;
  function set(name: 'timeout' | 'maxDataSize', value: number): void;
  function set(name: 'gzip' | 'referer' | 'followMetaRefresh' | 'forceHtml' | 'debug', value: boolean): void;
  function set(name: 'headers' | 'agentOptions', value: FreeObject, nomerge?: boolean): void;

  function setIconvEngine(icmod: 'iconv' | 'iconv-jp' | 'iconv-lite'): void;
  function setBrowser(type:
                      'ie' | 'edge' | 'chrome' | 'firefox' |
                      'opera' | 'vivaldi' | 'safari' |
                      'ipad' | 'iphone' | 'ipod' | 'android' |
                      'googlebot'): boolean;

  function fetch(url: string, param: {[ name: string ]: any}, encode: string, callback: FetchCallback): void;
  function fetch(url: string, param: {[ name: string ]: any}, callback: FetchCallback): void;
  function fetch(url: string, encode: string, callback: FetchCallback): void;
  function fetch(url: string, callback: FetchCallback): void;

  function fetch(url: string, param: {[ name: string ]: any}, encode: string): Promise;
  function fetch(url: string, param: {[ name: string ]: any}): Promise;
  function fetch(url: string, encode: string): Promise;
  function fetch(url: string): Promise;

  function fetchSync(url: string, param: {[ name: string ]: any}, encode: string): FetchResult;
  function fetchSync(url: string, param: {[ name: string ]: any}): FetchResult;
  function fetchSync(url: string, encode: string): FetchResult;
  function fetchSync(url: string): FetchResult;
}

// cheerio拡張メソッド(オリジナルのinterfaceにマージ)
declare global {
  interface Cheerio {
    click(callback: CheerioHttpcli.FetchCallback): void;
    click(): CheerioHttpcli.Promise;
    clickSync(): CheerioHttpcli.FetchResult;
    download(srcAttr?: string | string[]): void;
    field(): {[ name: string ]: string | number};
    field(name: string): string | number;
    field(name: string, value: string | (() => string), onNotFound?: 'append' | 'throw'): Cheerio;
    field(name: {[ name: string ]: string | number}, onNotFound?: 'append' | 'throw'): Cheerio;
    entityHtml(): string;
    entityHtml(html: string): Cheerio;
    submit(param: {[ name: string ]: string | number}, callback: CheerioHttpcli.FetchCallback): void;
    submit(callback: CheerioHttpcli.FetchCallback): void;
    submit(param?: {[ name: string ]: string | number}): CheerioHttpcli.Promise;
    submitSync(param?: {[ name: string ]: string | number}): CheerioHttpcli.FetchResult;
    tick(): Cheerio;
    untick(): Cheerio;
    url(optFilter: { absolute?: boolean, relative?: boolean, invalid?: boolean }, srcAttrs?: string | string[]): string | string[];
    url(srcAttrs?: string | string[]): string | string[];
  }
}

export = CheerioHttpcli;

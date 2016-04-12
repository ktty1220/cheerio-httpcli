/**
 * cheerio-httpcli for TypeScript definition file (very very very alpha)
 *
 * install
 * $ typings i node cheerio -A -S
 * $ typings i file:node_modules/cheerio-httpcli/cheerio-httpcli.d.ts --name cheerio-httpcli -A -S
 */
declare module Rsvp {
  interface Thenable {
    then(cb1: Function, cb2?: Function): Thenable;
  }

  export class Promise implements Thenable {
    static cast(p: Promise): Promise;
    static cast(object?: any): Promise;
    static resolve(t: Thenable): Promise;
    static resolve(obj?: any): Promise;
    static reject(error?: any): Promise;
    static all(p: Promise[]): Promise;
    static race(p: Promise[]): Promise;
    constructor(cb: Function);
    then(cb1: Function, cb2?: Function): Thenable;
    catch(onReject?: (error: any) => Thenable): Promise;
    catch(onReject?: Function): Promise;
    finally(): void;
  }
}

interface CheerioStatic {
  entityHtml(options?: CheerioOptionsInterface): string;
  entityHtml(selector: string, options?: CheerioOptionsInterface): string;
  entityHtml(element: Cheerio, options?: CheerioOptionsInterface): string;
  entityHtml(element: CheerioElement, options?: CheerioOptionsInterface): string;
}

interface Cheerio {
  entityHtml(): string;
  entityHtml(html: string): Cheerio;
  // TODO: cheerio拡張メソッド追加
}

declare module 'cheerio-httpcli' {
  import http = require('http');

  namespace Core {
    interface Headers {
      [ name: string ]: string;
    }
    interface FetchParams {
      [ name: string ]: any;
    }
    interface FetchResult {
      error: Error;
      $: CheerioStatic;
      response: http.IncomingMessage;
      body: string;
    }
    type FetchCallbak = (error: Error, $: CheerioStatic, response: http.IncomingMessage, body: string) => void;
    type IconvModule = 'iconv' | 'iconv-jp' | 'iconv-lite';
    type BrowserType = 'ie' | 'edge' | 'chrome' | 'firefox' | 'opera' | 'vivaldi' | 'safari' | 'ipad' | 'iphone'| 'ipod' | 'android'|  'googlebot';

    var version: string;
    var headers: Headers;
    var timeout: number;
    var gzip: boolean;
    var referer: boolean;
    var followMetaRefresh: boolean;
    var maxDataSize: boolean;
    var debug: boolean;

    function reset(): void;
    function setIconvEngine(icmod: IconvModule): void;
    function setBrowser(type: BrowserType): boolean;

    function fetch(url: string, param: FetchParams, encode: string, callback: FetchCallbak): void;
    function fetch(url: string, param: FetchParams, callback: FetchCallbak): void;
    function fetch(url: string, encode: string, callback: FetchCallbak): void;
    function fetch(url: string, callback: FetchCallbak): void;

    function fetch(url: string, param: FetchParams, encode: string): Rsvp.Promise;
    function fetch(url: string, param: FetchParams): Rsvp.Promise;
    function fetch(url: string, encode: string): Rsvp.Promise;
    function fetch(url: string): Rsvp.Promise;

    function fetchSync(url: string, param: FetchParams, encode: string): FetchResult;
    function fetchSync(url: string, param: FetchParams): FetchResult;
    function fetchSync(url: string, encode: string): FetchResult;
    function fetchSync(url: string): FetchResult;
  }

  export default Core;
}

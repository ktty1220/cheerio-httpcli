// Type definitions for cheerio-httpcli@0.6.9
// Project: https://github.com/ktty1220/cheerio-httpcli
// Definitions by: ktty1220 <ktty1220@gmail.com>

import * as http from 'http';
import * as url from 'url';
import * as stream from 'stream';

// rsvp.Promise
declare namespace Rsvp {
  interface Thenable {
    then(cb1: Function, cb2?: Function): Thenable;
  }

  export class Promise implements Thenable {
    public static cast(p: Promise): Promise;
    public static cast(object?: any): Promise;
    public static resolve(t: Thenable): Promise;
    public static resolve(obj?: any): Promise;
    public static reject(error?: any): Promise;
    public static all(p: Promise[]): Promise;
    public static race(p: Promise[]): Promise;
    constructor(cb: Function);
    public then(cb1: Function, cb2?: Function): Thenable;
    public catch(onReject?: (error: any) => Thenable): Promise;
    public catch(onReject?: Function): Promise;
    public finally(): void;
  }
}

// cheerio-httpcli本体
declare namespace CheerioHttpcli {
  interface Headers {
    [ name: string ]: string;
  }
  interface Cookies {
    [ name: string ]: string;
  }
  interface FetchParams {
    [ name: string ]: any;
  }
  interface FormInputs {
    [ name: string ]: string | number;
  }
  interface FetchResponse extends http.IncomingMessage {
    cookies: Cookies;
  }
  interface FetchResult {
    error: Error;
    $: CheerioStatic;
    response: FetchResponse;
    body: string;
  }
  type FetchCallback = (error: Error, $: CheerioStatic, response: FetchResponse, body: string) => void;
  type IconvModule = 'iconv' | 'iconv-jp' | 'iconv-lite';
  type BrowserType =
    'ie' | 'edge' | 'chrome' | 'firefox' | 'opera' | 'vivaldi' |
    'safari' | 'ipad' | 'iphone'| 'ipod' | 'android'| 'googlebot';
  type ReturnStringFunction = () => string;
  type StringOrStringArray = string | string[];
  type OnNotFound = 'append' | 'throw';

  interface URLFilter {
    absolute?: boolean;
    relative?: boolean;
    invalid?: boolean;
  }

  interface DocumentInfo {
    url: string;
    encoding: string | null;
  }

  namespace Download {
    type ToBufferCallback = (error: Error, buffer: Buffer) => void;
    interface State {
      queue: number;
      complete: number;
      error: number;
    }
    interface Stream extends stream.Stream {
      url: url.Url;
      type: string;
      length: number;
      toBuffer: ToBufferCallback;
      end(): void;
    }
    interface ErrorEx extends Error {
      url: string;
    }
    type EventOnReady = (stream: Stream) => void;
    type EventOnError = (error: ErrorEx) => void;
    type EventOnEnd = () => void;
    type Events = EventOnReady | EventOnError | EventOnEnd;

    export interface Manager {
      parallel: number;
      state: State;
      clearCache(): void;
      on(events: string, handler: Events): void;
    }
  }

  let version: string;
  let headers: Headers;
  let timeout: number;
  let gzip: boolean;
  let referer: boolean;
  let followMetaRefresh: boolean;
  let maxDataSize: boolean;
  let debug: boolean;
  const download: Download.Manager;

  function reset(): void;
  function setIconvEngine(icmod: IconvModule): void;
  function setBrowser(type: BrowserType): boolean;

  function fetch(url: string, param: FetchParams, encode: string, callback: FetchCallback): void;
  function fetch(url: string, param: FetchParams, callback: FetchCallback): void;
  function fetch(url: string, encode: string, callback: FetchCallback): void;
  function fetch(url: string, callback: FetchCallback): void;

  function fetch(url: string, param: FetchParams, encode: string): Rsvp.Promise;
  function fetch(url: string, param: FetchParams): Rsvp.Promise;
  function fetch(url: string, encode: string): Rsvp.Promise;
  function fetch(url: string): Rsvp.Promise;

  function fetchSync(url: string, param: FetchParams, encode: string): FetchResult;
  function fetchSync(url: string, param: FetchParams): FetchResult;
  function fetchSync(url: string, encode: string): FetchResult;
  function fetchSync(url: string): FetchResult;
}

// cheerio本体拡張
interface CheerioStatic {
  documentInfo: CheerioHttpcli.DocumentInfo;
  entityHtml(options?: CheerioOptionsInterface): string;
  entityHtml(selector: string, options?: CheerioOptionsInterface): string;
  entityHtml(element: Cheerio, options?: CheerioOptionsInterface): string;
  entityHtml(element: CheerioElement, options?: CheerioOptionsInterface): string;
}

// cheerio拡張メソッド
interface Cheerio {
  click(callback: CheerioHttpcli.FetchCallback): void;
  click(): Rsvp.Promise;
  clickSync(): CheerioHttpcli.FetchResult;
  download(srcAttr?: CheerioHttpcli.StringOrStringArray): void;
  field(name: string): string | number;
  field(name: string, value: string | CheerioHttpcli.ReturnStringFunction, onNotFound?: CheerioHttpcli.OnNotFound): Cheerio;
  field(name: CheerioHttpcli.FormInputs, onNotFound?: CheerioHttpcli.OnNotFound): Cheerio;
  entityHtml(): string;
  entityHtml(html: string): Cheerio;
  submit(param: CheerioHttpcli.FormInputs, callback: CheerioHttpcli.FetchCallback): void;
  submit(callback: CheerioHttpcli.FetchCallback): void;
  submit(param?: CheerioHttpcli.FormInputs): Rsvp.Promise;
  submitSync(param?: CheerioHttpcli.FormInputs): CheerioHttpcli.FetchResult;
  tick(): Cheerio;
  untick(): Cheerio;
  url(optFilter: CheerioHttpcli.URLFilter, srcAttrs?: CheerioHttpcli.StringOrStringArray): CheerioHttpcli.StringOrStringArray;
  url(srcAttrs?: CheerioHttpcli.StringOrStringArray): CheerioHttpcli.StringOrStringArray;
}

declare module 'cheerio-httpcli' {
  export default CheerioHttpcli;
}

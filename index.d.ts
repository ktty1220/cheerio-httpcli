import * as http from 'http';
import * as url from 'url';
import * as stream from 'stream';
import { Promise } from 'rsvp';
import 'cheerio';

// cheerio-httpcli本体
declare namespace CheerioHttpcli {
  interface FetchResponse extends http.IncomingMessage {
    cookies: { [name: string]: string };
  }

  // CheerioStatic拡張
  interface CheerioStaticEx extends CheerioStatic {
    documentInfo(): { url: string; encoding: string | null; isXml: boolean };
    entityHtml(options?: CheerioOptionsInterface): string;
    entityHtml(selector: string, options?: CheerioOptionsInterface): string;
    entityHtml(element: Cheerio, options?: CheerioOptionsInterface): string;
    entityHtml(element: CheerioElement, options?: CheerioOptionsInterface): string;
  }

  // fetchの戻り値
  interface FetchResult {
    error: Error;
    $: CheerioStaticEx;
    response: FetchResponse;
    body: string;
  }
  type FetchCallback = (
    error: Error,
    $: CheerioStaticEx,
    response: FetchResponse,
    body: string
  ) => void;

  // ダウンロードマネージャー
  namespace Download {
    interface Stream extends stream.Stream {
      url: url.Url;
      type: string;
      length: number;
      toBuffer(callback: (error: Error, buffer: Buffer) => void): void;
      toBuffer(): Promise<Buffer>;
      saveAs(filepath: string, callback: (error: Error) => void): void;
      saveAs(filepath: string): Promise<void>;
      end(): void;
    }
    interface ErrorEx extends Error {
      url: string;
    }

    export interface Manager {
      parallel: number;
      state: { queue: number; complete: number; error: number };
      clearCache(): void;
      on(event: 'add', handler: (url: string) => void): Manager;
      on(event: 'ready', handler: (stream: Stream) => void): Manager;
      on(event: 'error', handler: (error: ErrorEx) => void): Manager;
      on(event: 'end', handler: () => void): Manager;
    }
  }

  // クッキー
  interface Cookie {
    name: string;
    value: string;
    url?: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite?: string;
  }

  // ※ここから先のインスタンス関連の定義が冗長すぎて死にたい
  type FreeObject = { [name: string]: string };
  type IconvMods = 'iconv' | 'iconv-jp' | 'iconv-lite';
  type NumConfigs = 'timeout' | 'maxDataSize';
  type BooleanConfigs = 'gzip' | 'referer' | 'followMetaRefresh' | 'forceHtml' | 'debug';
  type ObjectConfigs = 'headers' | 'agentOptions';
  type SpecialConfigs = 'browser' | 'iconv';
  type Browsers =
    | 'chrome'
    | 'firefox'
    | 'edge'
    | 'ie'
    | 'vivaldi'
    | 'opera'
    | 'yandex'
    | 'safari'
    | 'ipad'
    | 'iphone'
    | 'ipod'
    | 'android'
    | 'ps4'
    | '3ds'
    | 'switch'
    | 'googlebot';

  // 親インスタンス
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

  function set(name: NumConfigs, value: number): void;
  function set(name: BooleanConfigs, value: boolean): void;
  function set(name: ObjectConfigs, value: FreeObject, nomerge?: boolean): void;
  function set(name: SpecialConfigs, value: string): void;

  function setIconvEngine(icmod: IconvMods): void;
  function setBrowser(type: Browsers): boolean;

  function importCookies(cookies: Cookie[]): void;
  function exportCookies():  Cookie[];

  function fetch(
    url: string,
    param: { [name: string]: any },
    encode: string,
    callback: FetchCallback
  ): void;
  function fetch(url: string, param: { [name: string]: any }, callback: FetchCallback): void;
  function fetch(url: string, encode: string, callback: FetchCallback): void;
  function fetch(url: string, callback: FetchCallback): void;

  function fetch(url: string, param: { [name: string]: any }, encode: string): Promise<FetchResult>;
  function fetch(url: string, param: { [name: string]: any }): Promise<FetchResult>;
  function fetch(url: string, encode: string): Promise<FetchResult>;
  function fetch(url: string): Promise<FetchResult>;

  function fetchSync(url: string, param: { [name: string]: any }, encode: string): FetchResult;
  function fetchSync(url: string, param: { [name: string]: any }): FetchResult;
  function fetchSync(url: string, encode: string): FetchResult;
  function fetchSync(url: string): FetchResult;

  // 子インスタンス
  interface ChildInstance {
    headers: FreeObject;
    agentOptions: FreeObject;
    timeout: number;
    maxDataSize: number;
    gzip: boolean;
    referer: boolean;
    followMetaRefresh: boolean;
    forceHtml: boolean;
    debug: boolean;
    browser: string;
    iconv: string;

    reset(): void;

    set(name: NumConfigs, value: number): void;
    set(name: BooleanConfigs, value: boolean): void;
    set(name: ObjectConfigs, value: FreeObject, nomerge?: boolean): void;
    set(name: SpecialConfigs, value: string): void;

    setIconvEngine(icmod: IconvMods): void;
    setBrowser(type: Browsers): boolean;

    importCookies(cookies: Cookie[]): void;
    exportCookies():  Cookie[];

    fetch(
      url: string,
      param: { [name: string]: any },
      encode: string,
      callback: FetchCallback
    ): void;
    fetch(url: string, param: { [name: string]: any }, callback: FetchCallback): void;
    fetch(url: string, encode: string, callback: FetchCallback): void;
    fetch(url: string, callback: FetchCallback): void;

    fetch(url: string, param: { [name: string]: any }, encode: string): Promise<FetchResult>;
    fetch(url: string, param: { [name: string]: any }): Promise<FetchResult>;
    fetch(url: string, encode: string): Promise<FetchResult>;
    fetch(url: string): Promise<FetchResult>;

    fetchSync(url: string, param: { [name: string]: any }, encode: string): FetchResult;
    fetchSync(url: string, param: { [name: string]: any }): FetchResult;
    fetchSync(url: string, encode: string): FetchResult;
    fetchSync(url: string): FetchResult;
  }

  function fork(): ChildInstance;
}

// cheerio拡張メソッド(オリジナルのinterfaceにマージ)
declare global {
  interface Cheerio {
    click(callback: CheerioHttpcli.FetchCallback): void;
    click(): Promise<CheerioHttpcli.FetchResult>;
    clickSync(): CheerioHttpcli.FetchResult;
    download(srcAttr?: string | string[]): void;
    field(): { [name: string]: string | number };
    field(name: string): string | number;
    field(name: string, value: string | (() => string), onNotFound?: 'append' | 'throw'): Cheerio;
    field(name: { [name: string]: string | number }, onNotFound?: 'append' | 'throw'): Cheerio;
    entityHtml(): string;
    entityHtml(html: string): Cheerio;
    submit(
      param: { [name: string]: string | number },
      callback: CheerioHttpcli.FetchCallback
    ): void;
    submit(callback: CheerioHttpcli.FetchCallback): void;
    submit(param?: { [name: string]: string | number }): Promise<CheerioHttpcli.FetchResult>;
    submitSync(param?: { [name: string]: string | number }): CheerioHttpcli.FetchResult;
    tick(): Cheerio;
    untick(): Cheerio;
    url(
      optFilter: { absolute?: boolean; relative?: boolean; invalid?: boolean },
      srcAttrs?: string | string[]
    ): string | string[];
    url(srcAttrs?: string | string[]): string | string[];
  }
}

export = CheerioHttpcli;

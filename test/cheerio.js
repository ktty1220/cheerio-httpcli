/*eslint-env mocha*/
/*eslint no-invalid-this:0, quote-props:0, no-undefined:0*/
var assert   = require('power-assert');
var type     = require('type-of');
var helper   = require('./_helper');
var cli      = require('../index');

describe('cheerio:click', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  it('a要素以外を指定してclickするとエラーとなる', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('div').eq(0).click(function (err, $, res, body) {
        assert(err.message === 'element is not link');
        assert(! res);
        assert(! $);
        assert(! body);
        done();
      });
    });
  });

  it('相対パスリンクをclickすると現在のページを基準にしたリンク先を取得する', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('.rel').click(function (err, $, res, body) {
        assert.deepEqual($.documentInfo(), {
          url: helper.url('auto', 'euc-jp'),
          encoding: 'euc-jp'
        });
        assert(type(res) === 'object');
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('外部URLリンクをclickするとそのURLのリンク先を取得する', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('.external').click(function (err, $, res, body) {
        assert.deepEqual($.documentInfo(), {
          url: 'http://www.yahoo.co.jp/',
          encoding: 'utf-8'
        });
        assert(type(res) === 'object');
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('ルートからの絶対パスリンクをclickするとドキュメントルートを基準にしたリンク先を取得する', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('.root').click(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info') + '?hoge=fuga&piyo=');
        assert(type(res) === 'object');
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('javascriptリンクをclickするとエラーとなる', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('.js').click(function (err, $, res, body) {
        assert(err.message === 'Invalid URI "javascript:history.back();"');
        assert(! res);
        assert(! $);
        assert(! body);
        done();
      });
    });
  });

  it('ハッシュリンクをclickすると結果的に同じページを取得するが現在のページ情報にハッシュが追加される', function (done) {
    var url = helper.url('form', 'utf-8');
    cli.fetch(url, function (err, $, res, body) {
      $('.hash').click(function (err, $, res, body) {
        assert($.documentInfo().url === url + '#hoge');
        assert(type(res) === 'object');
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('複数のa要素を指定してclickすると先頭のリンクのみが対象となる', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('a').click(function (err, $, res, body) {
        assert.deepEqual($.documentInfo(), {
          url: helper.url('auto', 'euc-jp'),
          encoding: 'euc-jp'
        });
        assert(type(res) === 'object');
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });
});

describe('cheerio:submit', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  it('form要素以外を指定してsubmitするとエラーとなる', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('div').eq(0).submit({ hoge: 'fuga' }, function (err, $, res, body) {
        assert(err.message === 'element is not form');
        assert(! $);
        assert(! res);
        assert(! body);
        done();
      });
    });
  });

  it('form要素のaction, method属性でフォームが送信される(GET)', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=get]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info') + '?hoge=fuga');
        var h = res.headers;
        assert(h['request-url'] === '/~info?hoge=fuga');
        assert(h['request-method'] === 'GET');
        assert(! h['post-data']);
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('form要素のaction, method属性でフォームが送信される(POST)', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=post]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'hoge=fuga');
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('form要素のmethod属性がない場合はGETでフォームが送信される', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name="no-method"]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info') + '?hoge=fuga');
        var h = res.headers;
        assert(h['request-url'] === '/~info?hoge=fuga');
        assert(h['request-method'] === 'GET');
        assert(! h['post-data']);
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('form要素のaction属性もmethod属性もない場合はGETかつ現ページに対してフォームが送信される', function (done) {
    var url = helper.url('form', 'utf-8');
    cli.fetch(url, function (err, $, res, body) {
      $('form[name="no-action-no-method"]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === url + '?hoge=fuga');
        var h = res.headers;
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('select要素を含んだフォームのselectedがフォーム送信パラメータのデフォルトになっている', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=select]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'single=2&multi=3&multi=5');
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('checkbox要素を含んだフォームのcheckedがフォーム送信パラメータのデフォルトになっている', function (done) {
    var param = '?check1=1&check2=&check3=&check4%5B0%5D=';
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=checkbox]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info') + param);
        var h = res.headers;
        assert(h['request-url'] === '/~info' + param);
        assert(h['request-method'] === 'GET');
        assert(! h['post-data']);
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('radio要素を含んだフォームのcheckedがフォーム送信パラメータのデフォルトになっている', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=radio]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'radio1=yyy&radio2=');
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('input要素のvalueがない場合空文字となる', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=no-input-value]').submit(function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'hoge=');
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('submit()時に指定するパラメータのvalueがnull/undefined/emptyの場合は"name="という形でURLに追加される', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=post]').submit({
        foo: null, bar: undefined, baz: ''
      }, function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'hoge=fuga&foo=&bar=&baz=');
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });

  it('submit()時に指定するパラメータが数字の0の場合は"name=0"という形でURLに追加される', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      $('form[name=post]').submit({ hoge: 0 }, function (err, $, res, body) {
        assert($.documentInfo().url === helper.url('~info'));
        var h = res.headers;
        assert(h['request-url'] === '/~info');
        assert(h['request-method'] === 'POST');
        assert(h['post-data'] === 'hoge=0');
        assert(type($) === 'function');
        assert(type(body) === 'string');
        done();
      });
    });
  });
});

var escapes = {
  'あいうえお': {
    'utf-8': '%E3%81%82%E3%81%84%E3%81%86%E3%81%88%E3%81%8A',
    'shift_jis': '%82%A0%82%A2%82%A4%82%A6%82%A8',
    'euc-jp': '%A4%A2%A4%A4%A4%A6%A4%A8%A4%AA'
  },
  'かきくけこ': {
    'utf-8': '%E3%81%8B%E3%81%8D%E3%81%8F%E3%81%91%E3%81%93',
    'shift_jis': '%82%A9%82%AB%82%AD%82%AF%82%B1',
    'euc-jp': '%A4%AB%A4%AD%A4%AF%A4%B1%A4%B3'
  },
  'さしすせそ': {
    'utf-8': '%E3%81%95%E3%81%97%E3%81%99%E3%81%9B%E3%81%9D',
    'shift_jis': '%82%B3%82%B5%82%B7%82%B9%82%BB',
    'euc-jp': '%A4%B5%A4%B7%A4%B9%A4%BB%A4%BD'
  },
  'たちつてと': {
    'utf-8': '%E3%81%9F%E3%81%A1%E3%81%A4%E3%81%A6%E3%81%A8',
    'shift_jis': '%82%BD%82%BF%82%C2%82%C4%82%C6',
    'euc-jp': '%A4%BF%A4%C1%A4%C4%A4%C6%A4%C8'
  },
  'なにぬねの': {
    'utf-8': '%E3%81%AA%E3%81%AB%E3%81%AC%E3%81%AD%E3%81%AE',
    'shift_jis': '%82%C8%82%C9%82%CA%82%CB%82%CC',
    'euc-jp': '%A4%CA%A4%CB%A4%CC%A4%CD%A4%CE'
  },
  'ははははは': {
    'utf-8': '%E3%81%AF%E3%81%AF%E3%81%AF%E3%81%AF%E3%81%AF',
    'shift_jis': '%82%CD%82%CD%82%CD%82%CD%82%CD',
    'euc-jp': '%A4%CF%A4%CF%A4%CF%A4%CF%A4%CF'
  },
  'ひひひひひ': {
    'utf-8': '%E3%81%B2%E3%81%B2%E3%81%B2%E3%81%B2%E3%81%B2',
    'shift_jis': '%82%D0%82%D0%82%D0%82%D0%82%D0',
    'euc-jp': '%A4%D2%A4%D2%A4%D2%A4%D2%A4%D2'
  },
  'ふふふふふ': {
    'utf-8': '%E3%81%B5%E3%81%B5%E3%81%B5%E3%81%B5%E3%81%B5',
    'shift_jis': '%82%D3%82%D3%82%D3%82%D3%82%D3',
    'euc-jp': '%A4%D5%A4%D5%A4%D5%A4%D5%A4%D5'
  },
  'へへへへへ': {
    'utf-8': '%E3%81%B8%E3%81%B8%E3%81%B8%E3%81%B8%E3%81%B8',
    'shift_jis': '%82%D6%82%D6%82%D6%82%D6%82%D6',
    'euc-jp': '%A4%D8%A4%D8%A4%D8%A4%D8%A4%D8'
  },
  'ほほほほほ': {
    'utf-8': '%E3%81%BB%E3%81%BB%E3%81%BB%E3%81%BB%E3%81%BB',
    'shift_jis': '%82%D9%82%D9%82%D9%82%D9%82%D9',
    'euc-jp': '%A4%DB%A4%DB%A4%DB%A4%DB%A4%DB'
  },
  'まみむめも': {
    'utf-8': '%E3%81%BE%E3%81%BF%E3%82%80%E3%82%81%E3%82%82',
    'shift_jis': '%82%DC%82%DD%82%DE%82%DF%82%E0',
    'euc-jp': '%A4%DE%A4%DF%A4%E0%A4%E1%A4%E2'
  }
};

helper.files('form').forEach(function (enc) {
  describe('cheerio:submit(' + enc + ')', function () {
    before(function () {
      this.server = helper.server();
    });
    after(function () {
      this.server.close();
    });

    it('デフォルトパラメータが日本語の場合はページのエンコーディングに合わせたURLエンコードで送信される', function (done) {
      cli.fetch(helper.url('form', enc), function (err, $, res, body) {
        $('form[name=default-jp]').submit(function (err, $, res, body) {
          var qp = helper.qsparse(res.headers['post-data']);
          assert.deepEqual(Object.keys(qp).sort(), [
            'checkbox', 'radio', 'select', 'text', 'textarea'
          ]);
          assert(qp.text === escapes['あいうえお'][enc]);
          assert(qp.checkbox === escapes['かきくけこ'][enc]);
          assert(qp.radio === escapes['なにぬねの'][enc]);
          assert.deepEqual(qp.select, [ escapes['ふふふふふ'][enc], escapes['ほほほほほ'][enc] ]);
          assert(qp.textarea === escapes['まみむめも'][enc]);
          done();
        });
      });
    });

    it('上書きパラメータが日本語の場合はページのエンコーディングに合わせたURLエンコードで送信される', function (done) {
      var set = {
        text: 'かきくけこ',
        checkbox: null,
        radio: 'たちつてと',
        select: [ 'ははははは', 'へへへへへ' ],
        textarea: ''
      };
      cli.fetch(helper.url('form', enc), function (err, $, res, body) {
        $('form[name=default-jp]').submit(set, function (err, $, res, body) {
          var qp = helper.qsparse(res.headers['post-data']);
          assert.deepEqual(Object.keys(qp).sort(), [
            'checkbox', 'radio', 'select', 'text', 'textarea'
          ]);
          assert(qp.text === escapes['かきくけこ'][enc]);
          assert(qp.checkbox === '');
          assert(qp.radio === escapes['たちつてと'][enc]);
          assert.deepEqual(qp.select, [ escapes['ははははは'][enc], escapes['へへへへへ'][enc] ]);
          assert(qp.textarea === '');
          done();
        });
      });
    });
  });
});

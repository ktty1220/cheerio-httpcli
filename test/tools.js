const tools = require('../lib/tools');

describe('cheerio:util', () => {
  describe('inArray', () => {
    test('配列内に該当あり => true', () => {
      expect(tools.inArray(['foo', 'bar', 'baz'], 'foo')).toStrictEqual(true);
    });
    test('配列内に該当なし => false', () => {
      expect(tools.inArray(['foo', 'bar', 'baz'], 'boo')).toStrictEqual(false);
    });
    test('配列以外 => 例外発生', () => {
      expect(() => tools.inArray('hoge', 'boo')).toThrow('hoge is not Array');
    });
  });

  describe('paramFilter', () => {
    test('文字列 => そのまま返す', () => {
      expect(tools.paramFilter('hoge')).toStrictEqual('hoge');
    });
    test('0 => そのまま返す', () => {
      expect(tools.paramFilter(0)).toStrictEqual(0);
    });
    test('null/undefined => 空文字を返す', () => {
      expect(tools.paramFilter(null)).toStrictEqual('');
      expect(tools.paramFilter(undefined)).toStrictEqual('');
    });
  });
});

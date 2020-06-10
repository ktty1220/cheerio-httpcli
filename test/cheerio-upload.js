const helper = require('./_helper');
const cli = require('../index');
const path = require('path');
const each = require('foreach');
const root = helper.serverConfig.root;
const endpoint = helper.endpoint();
const imgLocalDir = 'img/img';
const fileLocalDir = 'img/file';
const relpath = 'test/fixtures';

describe('cheerio:upload', () => {
  const expected = {
    single: {
      fields: {
        title: 'あいうえお',
        comment: 'this is cat'
      },
      files: [
        {
          name: 'cat.png',
          size: 15572,
          hash: helper.toHash(`${imgLocalDir}/cat.png`)
        }
      ]
    },
    multi: {
      fields: {
        title: 'かきくけこ',
        'choice[0]': 'あいうえお',
        'choice[1]': 'さしすせそ'
      },
      files: [
        {
          name: 'foobarbaz.zip',
          size: 270,
          hash: helper.toHash(`${fileLocalDir}/foobarbaz.zip`)
        },
        {
          name: 'food.jpg',
          size: 3196,
          hash: helper.toHash(`${imgLocalDir}/food.jpg`)
        }
      ]
    }
  };

  describe('async', () => {
    each(helper.files('form'), (enc) => {
      test(`単一ファイル(${enc})`, () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/${enc}.html`, (err, $, res, body) => {
            $('form[name=upload-single]').submit(
              {
                title: expected.single.fields.title,
                comment: expected.single.fields.comment,
                upload_file: path.join(root, `${imgLocalDir}/cat.png`)
              },
              (err, $, res, body) => {
                expect(err).toBeUndefined();
                expect(JSON.parse(body)).toStrictEqual(expected.single);
                resolve();
              }
            );
          });
        });
      });

      test(`複数ファイル(${enc})`, () => {
        return new Promise((resolve, reject) => {
          cli.fetch(`${endpoint}/form/${enc}.html`, (err, $, res, body) => {
            const $form = $('form[name=upload-multi]');
            $('[name=title]', $form).val(expected.multi.fields.title);
            $('[name="choice[]"]', $form).each(function () {
              if ($(this).val() === 'かきくけこ') return;
              $(this).tick();
            });
            $('[name=upload_file]', $form).val([
              path.join(root, `${fileLocalDir}/foobarbaz.zip`),
              path.join(relpath, `${imgLocalDir}/food.jpg`)
            ]);
            $form
              .submit()
              .then(({ err, body }) => {
                expect(err).toBeUndefined();
                expect(JSON.parse(body)).toStrictEqual(expected.multi);
                resolve();
              })
              .catch(reject);
          });
        });
      });
    });
  });

  describe('sync', () => {
    each(helper.files('form'), (enc) => {
      test(`単一ファイル(${enc})`, () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/${enc}.html`, (err, $, res, body) => {
            const $form = $('form[name=upload-single]');
            $('[name=title]', $form).val(expected.single.fields.title);
            $('[name=comment]', $form).val(expected.single.fields.comment);
            $('[name=upload_file]', $form).val(path.join(relpath, `${imgLocalDir}/cat.png`));
            const result = $form.submitSync();
            expect(result.err).toBeUndefined();
            expect(JSON.parse(result.body)).toStrictEqual(expected.single);
            resolve();
          });
        });
      });

      test(`複数ファイル(${enc})`, () => {
        return new Promise((resolve) => {
          cli.fetch(`${endpoint}/form/${enc}.html`, (err, $, res, body) => {
            const result = $('form[name=upload-multi]').submitSync({
              title: expected.multi.fields.title,
              'choice[]': [expected.multi.fields['choice[0]'], expected.multi.fields['choice[1]']],
              upload_file: [
                path.join(relpath, `${fileLocalDir}/foobarbaz.zip`),
                path.join(root, `${imgLocalDir}/food.jpg`)
              ]
            });
            expect(result.err).toBeUndefined();
            expect(JSON.parse(result.body)).toStrictEqual(expected.multi);
            resolve();
          });
        });
      });
    });
  });

  test('存在しないファイルを指定 => エラー', async () => {
    const { $ } = await cli.fetch(`${endpoint}/form/utf-8.html`);
    const notExistsFile = path.join(root, `${fileLocalDir}/not_exists.file`);
    await expect(
      $('form[name=upload-multi]').submit({
        title: expected.multi.fields.title,
        comment: expected.multi.fields.comment,
        upload_file: [notExistsFile, path.join(root, `${imgLocalDir}/food.jpg`)]
      })
    ).rejects.toThrow(`no such file or directory, open '${notExistsFile}'`);
  });

  test('multipleでない要素で複数のファイルを指定 => エラー', () => {
    return new Promise((resolve) => {
      cli.fetch(`${endpoint}/form/utf-8.html`, (err, $, res, body) => {
        $('form[name=upload-single]').submit(
          {
            title: expected.single.fields.title,
            comment: expected.single.fields.comment,
            upload_file: [
              path.join(root, `${fileLocalDir}/foobarbaz.zip`),
              path.join(root, `${imgLocalDir}/food.jpg`)
            ]
          },
          function (err, $, res, body) {
            expect(err).toBeDefined();
            expect(err.message).toStrictEqual('this element does not accept multiple files');
            resolve();
          }
        );
      });
    });
  });
});

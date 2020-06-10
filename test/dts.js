const path = require('path');
const ts = require('typescript');
const { printReceived } = require('jest-matcher-utils');

expect.extend({
  hasError(received) {
    if (received.length > 0) {
      return {
        message: () => printReceived(received.join('\n')),
        pass: false
      };
    }
    return {
      message: () => 'No error occurred',
      pass: true
    };
  }
});

describe('dts error check', () => {
  test('compile check.ts', () => {
    const program = ts.createProgram([path.join(__dirname, 'check.ts')], {
      module: 'commonjs',
      target: 'es5',
      allowSyntheticDefaultImports: true,
      allowUnreachableCode: false,
      allowUnusedLabels: false,
      alwaysStrict: true,
      noImplicitAny: true,
      noImplicitReturns: true,
      noImplicitThis: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
      suppressImplicitAnyIndexErrors: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      strictFunctionTypes: true,
      strictNullChecks: true,
      pretty: true,
      importHelpers: false,
      noEmitOnError: true,
      noEmit: true
    });

    const errors = [];
    ts.getPreEmitDiagnostics(program)
      .concat(program.emit().diagnostics)
      .forEach((d) => {
        if (d.file) {
          const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
          const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
          errors.push(
            [path.basename(d.file.fileName), `(${line + 1},${character + 1}):`, message].join(' ')
          );
        } else {
          errors.push(`${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
        }
      });

    expect(errors).hasError();
  });
});

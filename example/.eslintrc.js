module.exports = {
  env: {
    node: true,
    browser: false
  },
  plugins: ['es5'],
  extends: ['prettier-standard', 'plugin:es5/no-es2016'],
  rules: {
    'prettier/prettier': ['error', require('../.prettierrc.json')]
  }
};

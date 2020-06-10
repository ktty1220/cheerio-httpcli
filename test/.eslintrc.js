module.exports = {
  env: {
    node: true,
    browser: false,
    jest: true,
    es2017: true
  },
  plugins: ['jest'],
  settings: {
    jest: {
      version: 25
    }
  },
  extends: ['prettier-standard', 'plugin:jest/recommended'],
  rules: {
    'handle-callback-err': 'off',
    'prettier/prettier': ['error', require('../.prettierrc.json')]
  }
};

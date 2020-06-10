module.exports = {
  globalSetup: '<rootDir>/test/_setup.js',
  globalTeardown: '<rootDir>/test/_teardown.js',
  testMatch: ['<rootDir>/test/[^_.]*.js'],
  collectCoverageFrom: ['<rootDir>/lib/**/*.js'],
  testTimeout: 60000
};

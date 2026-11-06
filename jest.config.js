module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['server.js', 'db.js', 'email.js', 'sms.js', 'lib/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 10000,
  globalSetup: '<rootDir>/tests/global-setup.js',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true
};

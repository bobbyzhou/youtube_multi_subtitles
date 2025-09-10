/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['jest-chrome'],
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  transform: {},
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    '*.js',
    '!jest.config.js',
    '!eslint.config.js',
    '!coverage/**',
    '!node_modules/**',
    '!__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 45,
      lines: 50,
      statements: 50
    }
  }
};


const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        MutationObserver: 'readonly',
        performance: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',

        // Chrome extension globals
        chrome: 'readonly',

        // Node.js/Jest globals
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',

        // Jest globals
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_', 'caughtErrorsIgnorePattern': '^_' }],
      'no-console': 'off', // Allow console for Chrome extension logging
      'no-undef': 'error',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'indent': 'off', // Disable indent rule for now due to mixed styles
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'no-empty': 'off', // Allow empty catch blocks for now
      'no-useless-escape': 'off' // Allow escapes in regex for now
    }
  },
  {
    files: ['**/*.test.js'],
    rules: {
      'no-undef': 'off' // Jest globals are handled above
    }
  }
];

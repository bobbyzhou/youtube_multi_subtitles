# Testing Guide

## Overview

This project uses Jest for testing with comprehensive coverage of unit tests, integration tests, and edge cases.

## Test Structure

```
__tests__/
├── background-edge-cases.test.js      # Edge cases and error handling
├── background-freeapi.test.js         # Free API translation tests
├── background-translateText.int.test.js # Integration tests
├── background-utils.test.js           # Utility function tests
├── content-dom.test.js                # DOM manipulation tests
├── content-utils.test.js              # Content script utilities
├── integration-full-flow.test.js      # End-to-end workflow tests
└── performance-monitor.test.js        # Performance monitoring tests
```

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch

# Run tests for CI (with colors and coverage)
npm run test:ci
```

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Terminal**: Summary displayed after test run
- **HTML**: Detailed report in `coverage/lcov-report/index.html`
- **LCOV**: Machine-readable format in `coverage/lcov.info`
- **JSON**: Summary data in `coverage/coverage-summary.json`

### Coverage Thresholds

Minimum coverage requirements:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Test Categories

### Unit Tests

Test individual functions in isolation:

```javascript
// Example: API key validation
test('isValidApiKey validates plausible Google style keys', () => {
  expect(isValidApiKey('')).toBe(false);
  expect(isValidApiKey('AIzaSyA-1234567890')).toBe(true);
});
```

### Integration Tests

Test complete workflows:

```javascript
// Example: Full translation flow
test('complete translation workflow', async () => {
  const mockJson = jest.fn().mockResolvedValue([[['你好世界']]]);
  global.fetch.mockResolvedValue({ ok: true, json: mockJson });
  
  const result = await translateText('Hello world', 'auto', 'zh-CN', '');
  expect(result).toBe('你好世界');
});
```

### Edge Case Tests

Test error conditions and boundary cases:

```javascript
// Example: Network error handling
test('translateWithFreeAPI handles network errors', async () => {
  global.fetch.mockRejectedValue(new Error('Network error'));
  
  await expect(translateWithFreeAPI('Hello', 'en', 'zh-CN'))
    .rejects.toThrow('Network error');
});
```

## Mocking Strategy

### Chrome APIs
```javascript
// Mock chrome.storage
chrome.storage = chrome.storage || {};
chrome.storage.sync = { get: jest.fn() };
chrome.storage.sync.get.mockImplementation((defaults, cb) => {
  cb({ ...defaults, apiKey: '', targetLanguage: 'zh-CN' });
});
```

### Fetch API
```javascript
// Mock successful API response
const mockJson = jest.fn().mockResolvedValue([[['translated text']]]);
global.fetch.mockResolvedValue({ 
  ok: true, 
  status: 200, 
  json: mockJson 
});
```

### DOM Environment
```javascript
// Set up test DOM structure
document.body.innerHTML = `
  <div id="movie_player">
    <div class="ytp-caption-window-container">
      <span class="captions-text">Original text</span>
    </div>
  </div>
`;
```

### Performance APIs
```javascript
// Mock performance.now for timing tests
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn()
};
```

## Test Environment Setup

### Jest Configuration

Key configuration in `jest.config.js`:
- **Environment**: jsdom for DOM testing
- **Setup**: jest-chrome for Chrome API mocking
- **Coverage**: Comprehensive reporting with thresholds
- **File patterns**: `**/__tests__/**/*.test.js`

### Global Mocks

Common mocks available in all tests:
- Chrome extension APIs (via jest-chrome)
- DOM environment (via jsdom)
- Console methods (Jest built-in)

## Writing New Tests

### Test File Naming
- Use `.test.js` suffix
- Place in `__tests__/` directory
- Name descriptively: `feature-type.test.js`

### Test Structure
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    jest.resetAllMocks();
  });

  test('should do something specific', () => {
    // Arrange
    const input = 'test input';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Best Practices

1. **Descriptive Names**: Test names should clearly describe what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
3. **Mock External Dependencies**: Isolate units under test
4. **Test Edge Cases**: Include boundary conditions and error scenarios
5. **Async Testing**: Use async/await for promise-based code
6. **Clean Mocks**: Reset mocks between tests to avoid interference

## Debugging Tests

### Common Issues

1. **Mock Not Working**: Ensure mocks are set up before importing modules
2. **Async Issues**: Use `await` for async operations
3. **DOM Not Available**: Use jsdom environment for DOM tests
4. **Chrome APIs Missing**: Include jest-chrome setup

### Debug Commands
```bash
# Run specific test file
npm test -- background-utils.test.js

# Run tests matching pattern
npm test -- --testNamePattern="API key"

# Run with verbose output
npm test -- --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Continuous Integration

Tests run automatically on:
- Push to main branch
- Pull requests to main
- Manual workflow dispatch

CI includes:
1. Dependency installation
2. Linting checks
3. Test execution with coverage
4. Coverage reporting

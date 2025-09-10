/**
 * @jest-environment jsdom
 */

describe('content-test.js loads and exposes globals', () => {
  beforeEach(() => {
    history.pushState({}, '', '/watch?v=123');
    // Define chrome to avoid optional chaining ReferenceError in logs
    global.chrome = { runtime: {} };

    jest.isolateModules(() => {
      require('../content-test.js');
    });
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('TestBilingualSubtitles class and instance exist', () => {
    expect(window.TestBilingualSubtitles).toBeTruthy();
    expect(window.testInstance).toBeTruthy();
    expect(typeof window.testInstance.test).toBe('function');
    expect(window.testInstance.test()).toBe('test success');
  });
});


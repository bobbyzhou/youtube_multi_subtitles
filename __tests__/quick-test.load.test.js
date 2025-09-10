/**
 * @jest-environment jsdom
 */

describe('quick-test.js loads and runs tests', () => {
  beforeEach(() => {
    history.pushState({}, '', '/watch?v=quick');
    global.chrome = {
      runtime: {
        lastError: undefined,
        sendMessage: jest.fn((msg, cb) => {
          if (msg?.type === 'GET_SETTINGS') {
            cb && cb({ success: true, settings: { apiKey: '', targetLanguage: 'zh-CN' } });
            return;
          }
          if (msg?.type === 'TRANSLATE_TEXT') {
            cb && cb({ success: true, translation: '\u4f60\u597d\u4e16\u754c', fromCache: false });
            return;
          }
          cb && cb({ success: false });
        })
      }
    };

    jest.isolateModules(() => {
      require('../quick-test.js');
    });
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('global helpers are exposed', () => {
    expect(typeof window.quickTest).toBe('function');
    expect(typeof window.testSettings).toBe('function');
    expect(typeof window.runAllTests).toBe('function');
  });
});


/**
 * @jest-environment jsdom
 */

describe('console-debug.js loads and exposes ytDebug', () => {
  beforeEach(() => {
    // Make URL look like a YouTube watch page to pass environment guard
    history.pushState({}, '', '/watch?v=abc');

    // Stub chrome runtime messaging
    global.chrome = {
      runtime: {
        lastError: undefined,
        sendMessage: jest.fn((msg, cb) => {
          if (msg?.type === 'GET_SETTINGS') {
            cb && cb({ success: true, settings: { apiKey: '', targetLanguage: 'zh-CN', displayPosition: 'bottom' } });
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
      require('../console-debug.js');
    });
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('ytDebug is defined and has callable functions', async () => {
    expect(window.ytDebug).toBeTruthy();
    expect(typeof window.ytDebug.checkEnvironment).toBe('function');
    expect(typeof window.ytDebug.testExtension).toBe('function');
    expect(typeof window.ytDebug.testTranslation).toBe('function');

    // Call a couple of functions to cover branches
    const envOk = window.ytDebug.checkEnvironment();
    expect(typeof envOk).toBe('boolean');

    const extResp = await window.ytDebug.testExtension();
    expect(extResp?.success).toBe(true);

    const transResp = await window.ytDebug.testTranslation();
    expect(transResp?.success).toBe(true);
  });
});


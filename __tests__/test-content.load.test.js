/**
 * @jest-environment jsdom
 */

describe('test-content.js loads and simpleDebug works', () => {
  beforeEach(() => {
    history.pushState({}, '', '/watch?v=t');
    global.chrome = {
      runtime: {
        lastError: undefined,
        sendMessage: jest.fn((msg, cb) => {
          if (msg?.type === 'GET_SETTINGS') {
            cb && cb({ success: true, settings: { apiKey: '', targetLanguage: 'zh-CN' } });
            return;
          }
          cb && cb({ success: false });
        })
      }
    };

    jest.isolateModules(() => {
      require('../test-content.js');
    });
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('globals and simpleDebug', () => {
    expect(window.testContentScript).toBe(true);
    expect(typeof window.simpleDebug).toBe('function');
    // Call the debug function to exercise message path
    window.simpleDebug();
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalled();
  });
});


/**
 * @jest-environment jsdom
 */

describe('manual-debug.js loads and exposes manualDebug', () => {
  beforeEach(() => {
    // Use a watch-like URL to make logs meaningful
    history.pushState({}, '', '/watch?v=xyz');

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
            cb && cb({ success: true, translation: '\u4f60\u597d', fromCache: true });
            return;
          }
          cb && cb({ success: false });
        })
      }
    };

    jest.isolateModules(() => {
      require('../manual-debug.js');
    });
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('manualDebug is defined and runFullDiagnosis can be called', async () => {
    expect(window.manualDebug).toBeTruthy();
    expect(typeof window.manualDebug.runFullDiagnosis).toBe('function');
    await window.manualDebug.runFullDiagnosis();
    // Do not call enableDebugMode here to avoid touching location.reload
  });
});


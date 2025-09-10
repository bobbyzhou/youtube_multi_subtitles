/**
 * @jest-environment jsdom
 */

require('jest-chrome');

describe('debug-tools.js loads and basic actions', () => {
  beforeEach(() => {
    // Ensure debug mode so UI is created
    window.localStorage.setItem('youtube-subtitles-debug', 'true');

    // Minimal stubs
    global.chrome = global.chrome || {};
    chrome.runtime = chrome.runtime || { sendMessage: jest.fn((_m, cb) => cb && cb({ success: true })) };

    // Provide bilingualSubtitles for some methods
    window.bilingualSubtitles = {
      settings: { enabled: true },
      translationCache: new Map(),
      translationQueue: new Map(),
      displayBilingualSubtitle: jest.fn()
    };

    document.body.innerHTML = '<div id="root"></div>';

    jest.isolateModules(() => {
      require('../debug-tools.js');
    });
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  test('exposes window.debugTools and toggles panel', () => {
    expect(window.debugTools).toBeTruthy();
    // Panel exists
    const panel = document.getElementById('youtube-subtitles-debug-panel');
    expect(panel).toBeTruthy();

    // Toggle
    window.debugTools.togglePanel();
    window.debugTools.togglePanel();

    // Diagnose returns an array
    const issues = window.debugTools.diagnose();
    expect(Array.isArray(issues)).toBe(true);
  });
});


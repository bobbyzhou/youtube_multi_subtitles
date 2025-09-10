const { translateText } = require('../background.js');
require('jest-chrome');

describe('background translateText with official API', () => {
  beforeEach(() => {
    // Ensure global chrome
    global.chrome = global.chrome || require('jest-chrome').chrome;

    // Default: apiPreference 'v2'
    chrome.storage = chrome.storage || {};
    chrome.storage.sync = chrome.storage.sync || { get: jest.fn() };
    chrome.storage.sync.get.mockImplementation((defaults, cb) => {
      cb({ ...defaults, apiPreference: 'v2' });
    });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('uses official v2 API and returns translation', async () => {
    // Mock official API success
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        data: { translations: [{ translatedText: 'Hola mundo' }] }
      })
    });

    const result = await translateText('Hello world', 'en', 'es', 'AIzaSyA-1234567890');
    expect(result).toBe('Hola mundo');
    expect(global.fetch).toHaveBeenCalled();
  });

  test('official API error triggers fallback result when preference forced to v2', async () => {
    // v2 forced, return non-ok; translateText should retry and then return fallback marker
    global.fetch.mockResolvedValue({ ok: false, status: 400, statusText: 'Bad', json: async () => ({}) });
    const result = await translateText('Oops', 'en', 'es', 'AIzaSyA-1234567890');
    expect(result).toBe('[翻译失败: Oops]');
  });

  test('auto preference: fallback from v2 to free API', async () => {
    // First set apiPreference to auto
    chrome.storage.sync.get.mockImplementation((defaults, cb) => {
      cb({ ...defaults, apiPreference: 'auto' });
    });

    // Mock v2 failing, free succeeding
    global.fetch.mockImplementation((url, opts) => {
      const u = String(url);
      if (u.includes('translation.googleapis.com')) {
        return Promise.resolve({ ok: false, status: 500, statusText: 'Err', json: async () => ({}) });
      }
      if (u.includes('translate.googleapis.com')) {
        return Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: async () => [[['你好']]] });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const result = await translateText('Hello', 'auto', 'zh-CN', 'AIzaSyA-1234567890');
    expect(result).toBe('你好');
  });
});


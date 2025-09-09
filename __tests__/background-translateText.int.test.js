const { translateText } = require('../background.js');
require('jest-chrome');

describe('translateText integration (free API path)', () => {
  beforeEach(() => {
    // Ensure chrome global exists
    global.chrome = global.chrome || {};
    chrome.storage = chrome.storage || {};
    chrome.storage.sync = chrome.storage.sync || { get: jest.fn() };

    chrome.storage.sync.get.mockImplementation((defaults, cb) => {
      cb({
        ...defaults,
        apiKey: '',
        apiPreference: 'auto',
        cacheTime: 24,
      });
    });

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('uses free API when no API key and returns translation', async () => {
    const mockJson = jest.fn().mockResolvedValue([[['你好']]]);
    global.fetch.mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: mockJson });

    const result = await translateText('Hello', 'auto', 'zh-CN', '');
    expect(result).toBe('你好');
    expect(global.fetch).toHaveBeenCalled();
  });
});


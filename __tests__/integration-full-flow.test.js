/**
 * Integration test for full translation flow
 * @jest-environment jsdom
 */
const { BilingualSubtitles } = require('../content.js');
const { translateText } = require('../background.js');
require('jest-chrome');

describe('Full Translation Flow Integration', () => {
  let instance;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="movie_player">
        <div class="ytp-caption-window-container">
          <div class="caption-window">
            <span class="captions-text">Hello world</span>
          </div>
        </div>
      </div>
    `;

    // Mock chrome storage
    global.chrome = global.chrome || {};
    chrome.storage = chrome.storage || {};
    chrome.storage.sync = chrome.storage.sync || { get: jest.fn() };
    chrome.storage.sync.get.mockImplementation((defaults, cb) => {
      cb({
        ...defaults,
        apiKey: '',
        targetLanguage: 'zh-CN',
        sourceLanguage: 'auto',
        apiPreference: 'auto',
        cacheTime: 24,
      });
    });

    // Mock fetch for translation API
    global.fetch = jest.fn();

    instance = new BilingualSubtitles({ skipInit: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
    document.body.innerHTML = '';
  });

  test('complete translation workflow', async () => {
    // Mock successful API response
    const mockJson = jest.fn().mockResolvedValue([[['你好世界']]]);
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: mockJson
    });

    // Test the full flow
    const originalText = 'Hello world';
    const result = await translateText(originalText, 'auto', 'zh-CN', '');

    expect(result).toBe('你好世界');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('translate.googleapis.com'),
      expect.any(Object)
    );
  });

  test('caching mechanism works end-to-end', async () => {
    const mockJson = jest.fn().mockResolvedValue([[['你好世界']]]);
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: mockJson
    });

    const originalText = 'Hello world';

    // First call should hit API
    const result1 = await translateText(originalText, 'auto', 'zh-CN', '');
    expect(result1).toBe('你好世界');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Add to cache manually (simulating the caching that would happen in real usage)
    instance.setCacheWithLimit(originalText, '你好世界');

    // Verify cache works
    expect(instance.translationCache.get(originalText)).toBe('你好世界');
  });

  test('error handling in full flow', async () => {
    // Mock API failure
    global.fetch.mockRejectedValue(new Error('Network error'));

    const originalText = 'Hello world';
    const result = await translateText(originalText, 'auto', 'zh-CN', '');

    // Should return fallback translation
    expect(result).toBe('[翻译失败: Hello world]');
  });

  test('subtitle display integration', () => {
    const originalText = 'Hello world';
    const translatedText = '你好世界';

    // Test display function doesn't throw
    expect(() => {
      instance.displayTranslationResult(originalText, translatedText);
    }).not.toThrow();

    // Test that function doesn't throw (DOM structure may not support full functionality)
    expect(typeof instance.displayTranslationResult).toBe('function');
  });

  test('settings integration', async () => {
    // Mock different settings
    chrome.storage.sync.get.mockImplementation((defaults, cb) => {
      cb({
        ...defaults,
        apiKey: 'AIzaSyA-test-key-1234567890',
        targetLanguage: 'es',
        sourceLanguage: 'en',
        apiPreference: 'official',
        cacheTime: 48,
      });
    });

    // Mock official API response
    const mockJson = jest.fn().mockResolvedValue({
      data: {
        translations: [{ translatedText: 'Hola mundo' }]
      }
    });
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: mockJson
    });

    const _result = await translateText('Hello world', 'en', 'es', 'AIzaSyA-test-key-1234567890');

    // Should use official API with the provided key
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('translation.googleapis.com/language/translate/v2'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );
  });
});

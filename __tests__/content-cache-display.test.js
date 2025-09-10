/**
 * @jest-environment jsdom
 */
const { BilingualSubtitles } = require('../content.js');

describe('BilingualSubtitles cache display and utilities', () => {
  let instance;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="html5-video-player"></div>
      <div class="ytp-caption-window-container">
        <div class="captions-text">Original subtitle</div>
      </div>
    `;

    global.chrome = global.chrome || {};
    chrome.runtime = chrome.runtime || { sendMessage: jest.fn() };

    instance = new BilingualSubtitles({ skipInit: true });
    instance.settings.showOriginal = true;

    // Prepare container
    instance.subtitleContainer = document.createElement('div');
    document.querySelector('.html5-video-player').appendChild(instance.subtitleContainer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('getEffectiveReserveLines respects autoReserveLines and showOriginal', () => {
    instance.settings.reserveLines = 2;
    instance.settings.autoReserveLines = true;
    instance.settings.showOriginal = true;
    expect(instance.getEffectiveReserveLines()).toBe(2);

    instance.settings.showOriginal = false;
    expect(instance.getEffectiveReserveLines()).toBe(1);

    instance.settings.autoReserveLines = false;
    expect(instance.getEffectiveReserveLines()).toBe(2);
  });

  test('displayBilingualSubtitle uses cached translation and forces visibility', async () => {
    const originalText = 'Hello world';
    const translated = '\u4f60\u597d\u4e16\u754c';
    instance.settings.apiPreference = 'auto';
    instance.getCurrentVideoId = jest.fn(() => 'vid');
    const cacheKey = `${instance.settings.targetLanguage}-${(instance.settings.apiPreference || 'auto')}-vid-${originalText}`;
    instance.translationCache.set(cacheKey, translated);

    await instance.displayBilingualSubtitle(originalText);

    const html = instance.subtitleContainer.innerHTML;
    expect(html).toContain('original-subtitle');
    expect(html).toContain('translated-subtitle');
    expect(html).toContain(translated);
    expect(instance.subtitleContainer.style.display).toBe('block');
  });

  test('setCacheWithLimit evicts oldest when exceeding max size', () => {
    instance.maxCacheSize = 1;
    instance.setCacheWithLimit('a', 'A');
    instance.setCacheWithLimit('b', 'B');
    expect(instance.translationCache.size).toBe(1);
    expect(instance.translationCache.has('a')).toBe(false);
    expect(instance.translationCache.get('b')).toBe('B');
  });

  test('displayTranslationResult reuses nodes and updates text', () => {
    instance.lastSubtitleText = 'foo';
    instance.subtitleContainer.innerHTML = `
      <div class="original-subtitle"></div>
      <div class="translated-subtitle loading" style="display:none"></div>
    `;
    instance.dom.originalEl = instance.subtitleContainer.querySelector('.original-subtitle');
    instance.dom.translatedEl = instance.subtitleContainer.querySelector('.translated-subtitle');

    instance.displayTranslationResult('foo', 'bar', { reuseNodes: true });

    expect(instance.dom.translatedEl.textContent).toBe('bar');
    expect(instance.dom.translatedEl.style.display).toBe('inline-block');
  });
});


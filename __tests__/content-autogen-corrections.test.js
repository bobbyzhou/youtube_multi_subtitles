/**
 * @jest-environment jsdom
 */
const { BilingualSubtitles } = require('../content.js');

describe('Auto-generated English corrections and flicker suppression', () => {
  let instance;
  let captionContainer;
  let captionTextEl;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="movie_player">
        <div class="ytp-caption-window-container">
          <div class="caption-window">
            <span class="captions-text"></span>
          </div>
        </div>
      </div>
      <div class="html5-video-player"></div>
    `;
    captionContainer = document.querySelector('.ytp-caption-window-container');
    captionTextEl = captionContainer.querySelector('.captions-text');

    instance = new BilingualSubtitles({ skipInit: true });
    // 关闭预览以验证合并与去抖动的行为
    instance.settings.previewDuringIncremental = false;

    instance.settings.animationEnabled = false;
    // 默认开启 loading，验证增量阶段不出现 flicker
    instance.settings.showLoadingIndicator = true;
    instance.createSubtitleContainer();

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  function setCaptionAndExtract(text) {
    captionTextEl.textContent = text;
    instance.extractCurrentSubtitle();
  }

  test('backspace-like correction is coalesced: only translate once after restabilization', async () => {
    const translateMock = jest.spyOn(instance, 'translateText').mockResolvedValue('你好世界');

    // Stable text then correction (shorter), then restabilize
    setCaptionAndExtract('Hello world');
    jest.advanceTimersByTime(120);
    setCaptionAndExtract('Hello worl'); // backspace-like correction
    jest.advanceTimersByTime(120);
    setCaptionAndExtract('Hello world');

    // Advance beyond debounce/stability window (300ms by implementation)
    jest.advanceTimersByTime(400);
    await Promise.resolve();

    expect(translateMock).toHaveBeenCalledTimes(1);
    expect(translateMock).toHaveBeenLastCalledWith('Hello world');
  });

  test('no loading text flicker during incremental tokens even when showLoadingIndicator is true', async () => {
    const translateMock = jest.spyOn(instance, 'translateText').mockResolvedValue('你好世界');

    // Incremental tokens
    setCaptionAndExtract('Hel');
    jest.advanceTimersByTime(50);
    setCaptionAndExtract('Hello');
    jest.advanceTimersByTime(50);
    setCaptionAndExtract('Hello worl');

    // During incremental phase, translated element should not show loading text
    const container = document.querySelector('.bilingual-subtitles-container');
    const translatedEl = container.querySelector('.translated-subtitle');
    expect(translatedEl).toBeTruthy();
    expect(translatedEl.textContent).not.toBe('翻译中...');
    expect(translatedEl.classList.contains('loading')).toBe(false);

    // Final stabilization
    setCaptionAndExtract('Hello world');
    jest.advanceTimersByTime(400);
    await Promise.resolve();

    expect(translateMock).toHaveBeenCalledTimes(1);
  });
});


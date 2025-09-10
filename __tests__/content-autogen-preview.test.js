/**
 * @jest-environment jsdom
 */
const { BilingualSubtitles } = require('../content.js');

describe('Preview translation during incremental tokens shows early and avoids loading flicker', () => {
  let instance;
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
    captionTextEl = document.querySelector('.ytp-caption-window-container .captions-text');

    instance = new BilingualSubtitles({ skipInit: true });
    instance.settings.animationEnabled = false;
    instance.settings.showLoadingIndicator = true; // default behavior enabled
    instance.settings.previewDuringIncremental = true; // enable preview for this test
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

  test('Internal space boundary triggers preview translation without loading; final translates once more', async () => {
    const translateMock = jest.spyOn(instance, 'translateText')
      .mockResolvedValueOnce('你好(预览)')
      .mockResolvedValueOnce('你好世界(终稿)');

    // Use internal space (trim() removes trailing space in extractor)
    setCaptionAndExtract('Hello w'); // contains internal space -> boundary
    await Promise.resolve();

    // No loading text should be visible
    const container = document.querySelector('.bilingual-subtitles-container');
    const translatedEl = container.querySelector('.translated-subtitle');
    expect(translatedEl).toBeTruthy();
    expect(translatedEl.textContent).not.toBe('翻译中...');

    expect(translateMock).toHaveBeenCalledTimes(1);
    expect(translateMock).toHaveBeenLastCalledWith('Hello w');

    // More incremental tokens (no extra preview for < throttle window)
    setCaptionAndExtract('Hello wo');
    jest.advanceTimersByTime(200);
    setCaptionAndExtract('Hello wor');
    jest.advanceTimersByTime(200);

    // Final token completes the sentence
    setCaptionAndExtract('Hello world');

    // Debounce window should elapse and trigger final translation
    jest.advanceTimersByTime(500);
    await Promise.resolve();

    expect(translateMock).toHaveBeenCalledTimes(2);
    expect(translateMock).toHaveBeenLastCalledWith('Hello world');

    // Should still not show loading at any point during this flow
    expect(translatedEl.classList.contains('loading')).toBe(false);
  });
});


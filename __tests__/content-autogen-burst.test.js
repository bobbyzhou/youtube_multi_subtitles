/**
 * @jest-environment jsdom
 */
const { BilingualSubtitles } = require('../content.js');

describe('Rapid incremental token bursts do not flicker and translate once', () => {
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
    instance.settings.showLoadingIndicator = true; // stress: allow loading text generally
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

  test('6 quick tokens within 30ms intervals coalesce to one translation call, no loading flicker', async () => {
    const translateMock = jest.spyOn(instance, 'translateText').mockResolvedValue('\u4f60\u597d\u4e16\u754c');

    const tokens = ['H', 'He', 'Hel', 'Hell', 'Hello', 'Hello world'];
    for (let i = 0; i < tokens.length; i++) {
      setCaptionAndExtract(tokens[i]);
      jest.advanceTimersByTime(30);
    }

    // During incremental phase, the translated element should not show loading text
    const container = document.querySelector('.bilingual-subtitles-container');
    const translatedEl = container.querySelector('.translated-subtitle');
    expect(translatedEl).toBeTruthy();
    expect(translatedEl.textContent).not.toBe('\u7ffb\u8bd1\u4e2d...');
    expect(translatedEl.classList.contains('loading')).toBe(false);

    // Advance beyond stability window and flush
    jest.advanceTimersByTime(500);
    await Promise.resolve();

    expect(translateMock).toHaveBeenCalledTimes(1);
    expect(translateMock).toHaveBeenLastCalledWith('Hello world');
  });
});


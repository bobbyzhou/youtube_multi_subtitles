/**
 * @jest-environment jsdom
 */
const { BilingualSubtitles } = require('../content.js');

describe('Auto-generated English incremental subtitles (debounce & coalesce)', () => {
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
    // 简化视觉影响
    instance.settings.showLoadingIndicator = false;
    instance.settings.animationEnabled = false;
    // 保证容器存在
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

  test('prefix extensions are coalesced: only one translation for the final stable text', async () => {
    // mock translation to resolve quickly
    const translateMock = jest.spyOn(instance, 'translateText').mockResolvedValue('你好世界');

    // simulate incremental tokens
    setCaptionAndExtract('Hel');
    jest.advanceTimersByTime(100);
    setCaptionAndExtract('Hello');
    jest.advanceTimersByTime(100);
    setCaptionAndExtract('Hello worl');
    jest.advanceTimersByTime(100);
    setCaptionAndExtract('Hello world');

    // translate should not be called immediately if debounce is active; advance past debounce window
    jest.advanceTimersByTime(400);

    // allow any pending microtasks
    await Promise.resolve();

    expect(translateMock).toHaveBeenCalledTimes(1);
    expect(translateMock).toHaveBeenCalledWith('Hello world');
  });

  test('DOM nodes are not rebuilt on incremental updates (original text updates only)', async () => {
    const translateMock = jest.spyOn(instance, 'translateText').mockResolvedValue('你好世界');

    // initial small token
    setCaptionAndExtract('Hel');
    jest.advanceTimersByTime(10);

    const container = document.querySelector('.bilingual-subtitles-container');
    // ensure base nodes exist
    const beforeOriginal = container.querySelector('.original-subtitle') || null;
    const beforeTranslated = container.querySelector('.translated-subtitle') || null;

    // more tokens
    setCaptionAndExtract('Hello');
    jest.advanceTimersByTime(10);
    setCaptionAndExtract('Hello worl');
    jest.advanceTimersByTime(10);

    const afterOriginal = container.querySelector('.original-subtitle') || null;
    const afterTranslated = container.querySelector('.translated-subtitle') || null;

    // nodes should be same instances (no rebuild)
    expect(afterOriginal).toBe(beforeOriginal);
    expect(afterTranslated).toBe(beforeTranslated);

    // advance to fire final translation
    setCaptionAndExtract('Hello world');
    jest.advanceTimersByTime(400);
    await Promise.resolve();

    expect(translateMock).toHaveBeenCalledTimes(1);
  });
});


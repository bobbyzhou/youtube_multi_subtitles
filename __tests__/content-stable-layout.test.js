const { BilingualSubtitles } = require('../content.js');

describe('BilingualSubtitles stable layout and showOriginal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // mock player container for createSubtitleContainer()
    const player = document.createElement('div');
    player.className = 'html5-video-player';
    document.body.appendChild(player);
  });

  test('reserve-space toggles with stableLayout and respects reserveLines', async () => {
    const inst = new BilingualSubtitles({ skipInit: true });
    inst.settings.stableLayout = true;
    inst.settings.reserveLines = 3;

    inst.createSubtitleContainer();

    expect(inst.subtitleContainer).toBeTruthy();
    expect(inst.subtitleContainer.classList.contains('reserve-space')).toBe(true);
    expect(inst.subtitleContainer.style.getPropertyValue('--bs-reserve-lines')).toBe('3');

    // turn off and update
    inst.handleSettingsUpdate({ stableLayout: false });
    expect(inst.subtitleContainer.classList.contains('reserve-space')).toBe(false);

    // turn on with a different lines value
    inst.handleSettingsUpdate({ stableLayout: true, reserveLines: 2 });
    expect(inst.subtitleContainer.classList.contains('reserve-space')).toBe(true);
    expect(inst.subtitleContainer.style.getPropertyValue('--bs-reserve-lines')).toBe('2');
  });

  test('showOriginal hide/show affects original element immediately', async () => {
    const inst = new BilingualSubtitles({ skipInit: true });
    // ensure container exists
    inst.createSubtitleContainer();

    // prime translation queue to avoid background messaging
    const original = 'Hello';
    const cacheKey = `${inst.settings.targetLanguage}-${original}`;
    inst.translationQueue.set(cacheKey, Promise.resolve('你好'));

    await inst.displayBilingualSubtitle(original);

    // original element should exist
    const origEl = inst.subtitleContainer.querySelector('.original-subtitle');
    expect(origEl).toBeTruthy();
    expect(origEl.style.display).toBe('');

    // hide
    inst.handleSettingsUpdate({ showOriginal: false });
    expect(inst.dom.originalEl.style.display).toBe('none');

    // show again
    inst.handleSettingsUpdate({ showOriginal: true });
    expect(inst.dom.originalEl.style.display === '' || inst.dom.originalEl.style.display === 'block').toBe(true);
  });
});


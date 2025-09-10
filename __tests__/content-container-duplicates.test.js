const { BilingualSubtitles } = require('../content.js');

describe('Duplicate subtitle containers handling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    // mock player container for createSubtitleContainer()
    const player = document.createElement('div');
    player.className = 'html5-video-player';
    document.body.appendChild(player);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('createSubtitleContainer removes ALL existing containers before creating a new one', () => {
    const inst = new BilingualSubtitles({ skipInit: true });

    const player = document.querySelector('.html5-video-player');
    // create two stale containers to simulate duplicates
    const stale1 = document.createElement('div');
    stale1.className = 'bilingual-subtitles-container';
    const stale2 = document.createElement('div');
    stale2.className = 'bilingual-subtitles-container';
    player.appendChild(stale1);
    player.appendChild(stale2);

    expect(document.querySelectorAll('.bilingual-subtitles-container').length).toBe(2);

    inst.createSubtitleContainer();

    // Before timers fire, new container exists and stale ones are scheduled for removal
    const allNow = document.querySelectorAll('.bilingual-subtitles-container');
    expect(allNow.length).toBe(1); // only the newly created should exist synchronously

    // run fade-out removal timers to ensure no side effects
    jest.runAllTimers();

    // still only one container
    expect(document.querySelectorAll('.bilingual-subtitles-container').length).toBe(1);
  });

  test('clearSubtitleDisplay clears content for all containers', () => {
    const inst = new BilingualSubtitles({ skipInit: true });
    const player = document.querySelector('.html5-video-player');

    // Create two containers with content
    const c1 = document.createElement('div');
    c1.className = 'bilingual-subtitles-container';
    c1.innerHTML = '<div class="original-subtitle">old1</div>';
    const c2 = document.createElement('div');
    c2.className = 'bilingual-subtitles-container';
    c2.innerHTML = '<div class="original-subtitle">old2</div>';
    player.appendChild(c1);
    player.appendChild(c2);

    // Point instance to one of them (as if it was the current container)
    inst.subtitleContainer = c2;

    inst.clearSubtitleDisplay();

    // after the fade-out timeout, both should be empty
    jest.runAllTimers();

    const contents = Array.from(document.querySelectorAll('.bilingual-subtitles-container')).map(el => el.innerHTML.trim());
    expect(contents.every(html => html === '')).toBe(true);
  });
});


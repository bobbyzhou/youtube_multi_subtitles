const { BilingualSubtitles } = require('../content.js');

describe('Aggressive prefetch settings sanity', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    const player = document.createElement('div');
    player.className = 'html5-video-player';
    document.body.appendChild(player);
  });

  test('aggressivePrefetchTick does not throw and respects defaults', () => {
    const inst = new BilingualSubtitles({ skipInit: true });
    // ensure settings presence
    expect(inst.settings.prefetchAggressive).toBeDefined();
    expect(inst.settings.prefetchIntervalMs).toBeDefined();

    // monkey patch to avoid DOM queries inside
    inst.preTranslateUpcomingSubtitles = jest.fn();

    // off mode should early return (no call)
    inst.settings.prefetchAggressive = 'off';
    inst.aggressivePrefetchTick();
    expect(inst.preTranslateUpcomingSubtitles).not.toHaveBeenCalled();

    // low/medium/high should call
    inst.settings.prefetchAggressive = 'low';
    inst.aggressivePrefetchTick();
    inst.settings.prefetchAggressive = 'medium';
    inst.aggressivePrefetchTick();
    inst.settings.prefetchAggressive = 'high';
    inst.aggressivePrefetchTick();

    expect(inst.preTranslateUpcomingSubtitles).toHaveBeenCalled();
  });
});


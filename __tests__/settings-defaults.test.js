const { BilingualSubtitles } = require('../content.js');

describe('default settings include aggressive prefetch and stable layout keys', () => {
  test('content.js has new defaults', () => {
    const inst = new BilingualSubtitles({ skipInit: true });
    const s = inst.settings;
    expect(s).toHaveProperty('prefetchAggressive');
    expect(s).toHaveProperty('prefetchLookahead');
    expect(s).toHaveProperty('prefetchIntervalMs');
    expect(s).toHaveProperty('stableLayout');
    expect(s).toHaveProperty('reserveLines');
  });
});


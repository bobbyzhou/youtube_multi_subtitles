const { BilingualSubtitles } = require('../content.js');

describe('BilingualSubtitles utilities', () => {
  test('escapeHtml escapes special characters', () => {
    const inst = new BilingualSubtitles({ skipInit: true });
    const input = '<div>"&\'';
    const escaped = inst.escapeHtml(input);
    expect(escaped).not.toContain('<div>');
    expect(escaped).toMatch(/&lt;div&gt;/);
  });

  test('setCacheWithLimit maintains max size by evicting oldest', () => {
    const inst = new BilingualSubtitles({ skipInit: true });
    inst.maxCacheSize = 3;
    inst.setCacheWithLimit('a', '1');
    inst.setCacheWithLimit('b', '2');
    inst.setCacheWithLimit('c', '3');
    expect(inst.translationCache.size).toBe(3);

    inst.setCacheWithLimit('d', '4');
    expect(inst.translationCache.size).toBe(3);
    // Oldest key 'a' should be evicted
    expect(inst.translationCache.has('a')).toBe(false);
    expect(inst.translationCache.get('d')).toBe('4');
  });
});


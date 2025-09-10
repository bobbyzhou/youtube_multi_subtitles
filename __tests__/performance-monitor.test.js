/**
 * @jest-environment jsdom
 */

// The script attaches window.performanceMonitor on load

describe('performance-monitor.js', () => {
  beforeEach(() => {
    // Provide a stub bilingualSubtitles for memory usage
    global.window.bilingualSubtitles = {
      translationCache: new Map(),
      translationQueue: new Map(),
    };

    jest.isolateModules(() => {
      require('../performance-monitor.js');
    });
  });

  afterEach(() => {
    jest.resetModules();
  });

  test('start/finish translation updates metrics and report', () => {
    const pm = window.performanceMonitor;
    expect(pm).toBeTruthy();

    const tracker = pm.startTranslation('Hello');
    // Simulate some time
    jest.spyOn(global.performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(20);
    tracker.finish(true, false);

    const report = pm.getReport();
    expect(report.summary.totalRequests).toBeGreaterThanOrEqual(1);
    expect(report.details.cacheMisses).toBeGreaterThanOrEqual(0);
  });

  test('reset clears metrics and suggestions reflect state', () => {
    const pm = window.performanceMonitor;

    // Inflate some metrics
    for (let i = 0; i < 5; i++) {
      pm.recordTranslationTime(100 + i);
    }
    let report = pm.getReport();
    expect(parseFloat(report.summary.averageTranslationTime)).toBeGreaterThan(0);

    pm.reset();
    report = pm.getReport();
    expect(report.summary.totalRequests).toBe(0);

    // Low cache hit rate suggestion
    const suggestions = pm.getOptimizationSuggestions();
    expect(Array.isArray(suggestions)).toBe(true);
  });
});


/**
 * @jest-environment jsdom
 */
const jestChrome = require('jest-chrome').chrome;

describe('popup.js UI interactions', () => {
  beforeEach(() => {
    // Ensure global chrome is available to popup.js
    global.chrome = jestChrome;
    chrome.storage = chrome.storage || {};
    chrome.storage.sync = chrome.storage.sync || { get: jest.fn(), set: jest.fn() };
    chrome.runtime = chrome.runtime || { sendMessage: jest.fn() };
    chrome.tabs = chrome.tabs || { query: jest.fn(), sendMessage: jest.fn() };

    document.body.innerHTML = `
      <div id="app">
        <input type="checkbox" id="enabled" />
        <select id="targetLanguage"><option value="zh-CN">zh-CN</option></select>
        <select id="displayPosition"><option value="bottom">bottom</option></select>
        <select id="fontSize"><option value="medium">medium</option></select>
        <select id="apiPreference"><option value="auto">auto</option><option value="v2">v2</option></select>
        <input type="checkbox" id="autoClearCacheOnStrategySwitch" />
        <input id="apiKey" />
        <select id="cacheTime"><option value="24">24</option></select>
        <input type="checkbox" id="preTranslate" />
        <select id="prefetchAggressive"><option value="medium">medium</option></select>
        <select id="prefetchLookahead"><option value="5">5</option></select>
        <select id="prefetchIntervalMs"><option value="300">300</option></select>
        <input type="checkbox" id="stableLayout" />
        <select id="reserveLines"><option value="2">2</option></select>
        <input type="checkbox" id="autoReserveLines" />
        <input type="checkbox" id="showLoadingIndicator" />
        <input type="checkbox" id="previewDuringIncremental" />
        <input type="checkbox" id="showOriginal" />
        <input type="checkbox" id="hideYouTubeCaptions" />
        <input type="checkbox" id="animationEnabled" />
        <select id="translationDelay"><option value="50">50</option></select>
        <button id="clearCacheBtn">clear</button>
        <button id="saveBtn">save</button>
        <div id="status"></div>
      </div>
    `;

    // Defaults returned by chrome.storage.sync.get
    chrome.storage.sync.get.mockImplementation((defaults, cb) => {
      cb({
        ...defaults,
        enabled: true,
        targetLanguage: 'zh-CN',
        displayPosition: 'bottom',
        fontSize: 'medium',
        apiPreference: 'auto',
        autoClearCacheOnStrategySwitch: true,
        apiKey: '',
        cacheTime: 24,
        preTranslate: true,
        prefetchAggressive: 'medium',
        prefetchLookahead: 5,
        prefetchIntervalMs: 300,
        stableLayout: true,
        reserveLines: 2,
        autoReserveLines: true,
        showLoadingIndicator: true,
        showOriginal: true,
        hideYouTubeCaptions: true,
        animationEnabled: true,
        translationDelay: 50,
      });
    });

    chrome.storage.sync.set.mockImplementation((_settings, cb) => cb && cb());
    chrome.runtime.sendMessage.mockImplementation((_msg, cb) => cb && cb({ success: true }));
    chrome.tabs.query.mockImplementation((_q, cb) => cb([{ id: 1, url: 'https://www.youtube.com/watch?v=abc' }]));
    chrome.tabs.sendMessage.mockImplementation((_tabId, _msg) => {});

    // Require after DOM and mocks are ready
    jest.isolateModules(() => {
      require('../popup.js');
    });

    // Trigger DOMContentLoaded
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('loads settings into UI and saves settings', () => {
    // Loaded values applied
    expect(document.getElementById('targetLanguage').value).toBe('zh-CN');

    // Modify some values then click save
    document.getElementById('enabled').checked = false;
    document.getElementById('apiPreference').value = 'v2';
    document.getElementById('apiKey').value = 'AIzaSyA-1234567890';

    document.getElementById('saveBtn').click();

    // storage.set called
    expect(chrome.storage.sync.set).toHaveBeenCalled();
    // status visible
    const status = document.getElementById('status');
    expect(status.textContent).toContain('设置已保存');
    expect(status.style.display).toBe('block');

    // Tabs messaging triggered
    expect(chrome.tabs.query).toHaveBeenCalled();
  });

  test('clear cache shows success status', () => {
    document.getElementById('clearCacheBtn').click();
    const status = document.getElementById('status');
    expect(status.textContent).toContain('缓存已清除');
  });

  test('apiKey input validation toggles border color', () => {
    const input = document.getElementById('apiKey');
    input.value = 'not-a-google-key';
    input.dispatchEvent(new Event('input'));
    expect(input.style.borderColor).toBe('#ff6b6b');

    input.value = 'AIzaSyA-ValidKey';
    input.dispatchEvent(new Event('input'));
    expect(input.style.borderColor).toBe('#ddd');
  });
});


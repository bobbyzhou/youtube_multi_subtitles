// popup.js - 处理设置界面的交互逻辑

document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const enabledToggle = document.getElementById('enabled');
  const targetLanguageSelect = document.getElementById('targetLanguage');
  const displayPositionSelect = document.getElementById('displayPosition');
  const fontSizeSelect = document.getElementById('fontSize');
  const apiPreferenceSelect = document.getElementById('apiPreference');
  const apiKeyInput = document.getElementById('apiKey');
  const cacheTimeSelect = document.getElementById('cacheTime');
  const preTranslateToggle = document.getElementById('preTranslate');
  const showOriginalToggle = document.getElementById('showOriginal');
  const hideYouTubeCaptionsToggle = document.getElementById('hideYouTubeCaptions');
  const animationEnabledToggle = document.getElementById('animationEnabled');
  const translationDelaySelect = document.getElementById('translationDelay');
  const prefetchAggressiveSelect = document.getElementById('prefetchAggressive');
  const prefetchLookaheadSelect = document.getElementById('prefetchLookahead');
  const prefetchIntervalMsSelect = document.getElementById('prefetchIntervalMs');
  const stableLayoutToggle = document.getElementById('stableLayout');
  const reserveLinesSelect = document.getElementById('reserveLines');
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // 默认设置
  const defaultSettings = {
    enabled: true,
    targetLanguage: 'zh-CN',
    displayPosition: 'bottom',
    fontSize: 'medium',
    apiPreference: 'auto',
    apiKey: '',
    cacheTime: 24,
    preTranslate: true,
    prefetchAggressive: 'medium',
    prefetchLookahead: 5,
    prefetchIntervalMs: 300,
    stableLayout: true,
    reserveLines: 2,
    showOriginal: true,
    animationEnabled: true,
    translationDelay: 50,
    hideYouTubeCaptions: true
  };

  // 加载保存的设置
  loadSettings();

  // 保存按钮点击事件
  saveBtn.addEventListener('click', saveSettings);

  // 清除缓存按钮点击事件
  clearCacheBtn.addEventListener('click', clearCache);

  // 加载设置
  function loadSettings() {
    chrome.storage.sync.get(defaultSettings, function(settings) {
      enabledToggle.checked = settings.enabled;
      targetLanguageSelect.value = settings.targetLanguage;
      displayPositionSelect.value = settings.displayPosition;
      fontSizeSelect.value = settings.fontSize;
      apiPreferenceSelect.value = settings.apiPreference;
      apiKeyInput.value = settings.apiKey;
      cacheTimeSelect.value = settings.cacheTime;
      preTranslateToggle.checked = settings.preTranslate;
      prefetchAggressiveSelect.value = settings.prefetchAggressive;
      prefetchLookaheadSelect.value = settings.prefetchLookahead;
      prefetchIntervalMsSelect.value = settings.prefetchIntervalMs;
      stableLayoutToggle.checked = settings.stableLayout;
      reserveLinesSelect.value = settings.reserveLines;
      showOriginalToggle.checked = settings.showOriginal;
      hideYouTubeCaptionsToggle.checked = settings.hideYouTubeCaptions;
      animationEnabledToggle.checked = settings.animationEnabled;
      translationDelaySelect.value = settings.translationDelay;
    });
  }

  // 保存设置
  function saveSettings() {
    const settings = {
      enabled: enabledToggle.checked,
      targetLanguage: targetLanguageSelect.value,
      displayPosition: displayPositionSelect.value,
      fontSize: fontSizeSelect.value,
      apiPreference: apiPreferenceSelect.value,
      apiKey: apiKeyInput.value.trim(),
      cacheTime: parseInt(cacheTimeSelect.value),
      preTranslate: preTranslateToggle.checked,
      prefetchAggressive: prefetchAggressiveSelect.value,
      prefetchLookahead: parseInt(prefetchLookaheadSelect.value),
      prefetchIntervalMs: parseInt(prefetchIntervalMsSelect.value),
      stableLayout: stableLayoutToggle.checked,
      reserveLines: parseInt(reserveLinesSelect.value),
      showOriginal: showOriginalToggle.checked,
      hideYouTubeCaptions: hideYouTubeCaptionsToggle.checked,
      animationEnabled: animationEnabledToggle.checked,
      translationDelay: parseInt(translationDelaySelect.value)
    };

    chrome.storage.sync.set(settings, function() {
      // 显示保存成功消息
      showStatus('设置已保存', 'success');

      // 通知content script设置已更新
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url.includes('youtube.com/watch')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'SETTINGS_UPDATED',
            settings: settings
          });
        }
      });
    });
  }

  // 清除缓存
  function clearCache() {
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, function(response) {
      if (response && response.success) {
        showStatus('缓存已清除', 'success');
      } else {
        showStatus('清除缓存失败', 'error');
      }
    });
  }

  // 显示状态消息
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    // 3秒后隐藏状态消息
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  // 监听设置变化，实时预览
  [enabledToggle, targetLanguageSelect, displayPositionSelect, fontSizeSelect,
   apiPreferenceSelect, apiKeyInput, cacheTimeSelect, preTranslateToggle, prefetchAggressiveSelect, prefetchLookaheadSelect, prefetchIntervalMsSelect,
   stableLayoutToggle, reserveLinesSelect, showOriginalToggle, hideYouTubeCaptionsToggle, animationEnabledToggle, translationDelaySelect].forEach(element => {
    element.addEventListener('change', function() {
      // 可以在这里添加实时预览逻辑
      console.log('Setting changed:', element.id, element.value || element.checked);
    });
  });

  // API Key输入验证
  apiKeyInput.addEventListener('input', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey && !apiKey.startsWith('AIza')) {
      apiKeyInput.style.borderColor = '#ff6b6b';
    } else {
      apiKeyInput.style.borderColor = '#ddd';
    }
  });
});

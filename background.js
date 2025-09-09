// background.js - Service Worker for handling translation API calls and caching

// 翻译API配置
const TRANSLATION_CONFIG = {
  // Google Translate API v2 端点
  GOOGLE_TRANSLATE_API_V2: 'https://translation.googleapis.com/language/translate/v2',
  // 免费端点作为备用
  GOOGLE_TRANSLATE_FREE: 'https://translate.googleapis.com/translate_a/single',
  MAX_RETRIES: 3,
  BATCH_SIZE: 10, // 批量翻译大小
  DEFAULT_CACHE_DURATION: 24 * 60 * 60 * 1000 // 24小时默认缓存
};

// 最近一次翻译所使用的API来源（'v2' | 'free' | null）
let LAST_API_SOURCE = null;


// Detect Extension environment (avoid side effects during Node/Jest tests)
const __IS_EXTENSION_ENV__ = (typeof chrome !== 'undefined' && !!chrome.runtime);

// 在扩展环境中才注册事件监听器，避免测试环境报错
if (__IS_EXTENSION_ENV__ && typeof window === 'undefined') {


// 安装时初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('YouTube双语字幕插件已安装/更新', details);

  const defaultSettings = {
    enabled: true,
    targetLanguage: 'zh-CN',
    displayPosition: 'bottom',
    fontSize: 'medium',
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
    animationEnabled: true,
    translationDelay: 50,
    hideYouTubeCaptions: true,
    apiPreference: 'auto' // 'auto' | 'v2' | 'free'
  };

  if (details && details.reason === 'install') {
    // 首次安装：写入默认配置
    chrome.storage.sync.set(defaultSettings);
  } else {
    // 更新：仅补全缺失的字段，不覆盖用户已有设置（尤其是 API Key）
    chrome.storage.sync.get(null, (current) => {
      const toSet = {};
      for (const [k, v] of Object.entries(defaultSettings)) {
        if (typeof current[k] === 'undefined') toSet[k] = v;
      }
      if (Object.keys(toSet).length) chrome.storage.sync.set(toSet);
    });
  }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'TRANSLATE_TEXT':
      handleTranslateRequest(request, sendResponse);
      return true; // 保持消息通道开放以进行异步响应

    case 'TRANSLATE_BATCH':
      handleBatchTranslateRequest(request, sendResponse);
      return true;

    case 'GET_CACHED_TRANSLATION':
      handleGetCachedTranslation(request, sendResponse);
      return true;

    case 'CLEAR_CACHE':
      handleClearCache(sendResponse);
      return true;

    case 'GET_SETTINGS':
      handleGetSettings(sendResponse);
      return true;

    case 'GET_LAST_API_SOURCE':
      sendResponse({ success: true, source: LAST_API_SOURCE });
      return true;


    default:
      console.log('Unknown message type:', request.type);
  }
});
} // end __IS_EXTENSION_ENV__ guard


// 处理翻译请求
async function handleTranslateRequest(request, sendResponse) {
  const { text, targetLanguage, sourceLanguage = 'auto' } = request;

  try {
    // 获取用户设置
    const settings = await getSettings();
    const cacheKey = `${sourceLanguage}-${targetLanguage}-${text}`;

    // 首先检查缓存
    const cached = await getCachedTranslation(cacheKey, settings.cacheTime);

    if (cached) {
      // 更新最近来源，便于前端显示
      LAST_API_SOURCE = cached.apiSource || LAST_API_SOURCE;
      sendResponse({ success: true, translation: cached.translation, fromCache: true, apiSource: LAST_API_SOURCE });
      return;
    }

    // 调用翻译API
    const translation = await translateText(text, sourceLanguage, targetLanguage, settings.apiKey);

    // 缓存结果
    await cacheTranslation(cacheKey, translation, settings.cacheTime, LAST_API_SOURCE);

    sendResponse({ success: true, translation, fromCache: false, apiSource: LAST_API_SOURCE });

  } catch (error) {
    console.error('❌ 翻译错误详情:', {
      message: error.message,
      stack: error.stack,
      text: text,
      targetLanguage: targetLanguage,
      sourceLanguage: sourceLanguage
    });

    sendResponse({
      success: false,
      error: `翻译失败: ${error.message}`
    });
  }
}

// 处理批量翻译请求
async function handleBatchTranslateRequest(request, sendResponse) {
  const { texts, targetLanguage, sourceLanguage = 'auto' } = request;

  try {
    const settings = await getSettings();
    const results = [];
    const uncachedTexts = [];
    const uncachedIndices = [];

    // 检查缓存
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const cacheKey = `${sourceLanguage}-${targetLanguage}-${text}`;
      const cached = await getCachedTranslation(cacheKey, settings.cacheTime);

      if (cached) {
        results[i] = { success: true, translation: cached.translation, fromCache: true };
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(i);
      }
    }

    // 批量翻译未缓存的文本
    if (uncachedTexts.length > 0) {
      const translations = await batchTranslateTexts(uncachedTexts, sourceLanguage, targetLanguage, settings.apiKey);

      for (let i = 0; i < uncachedTexts.length; i++) {
        const originalIndex = uncachedIndices[i];
        const text = uncachedTexts[i];
        const translation = translations[i];

        results[originalIndex] = { success: true, translation, fromCache: false };

        // 缓存结果
        const cacheKey = `${sourceLanguage}-${targetLanguage}-${text}`;
        await cacheTranslation(cacheKey, translation, settings.cacheTime);
      }
    }

    sendResponse({ success: true, results });

  } catch (error) {
    console.error('Batch translation error:', error);
    sendResponse({
      success: false,
      error: error.message || '批量翻译失败，请稍后重试'
    });
  }
}

// 验证API Key是否有效（始终返回布尔值）
function isValidApiKey(apiKey) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  console.log('🔍 检查API Key:', {
    apiKey: apiKey,
    type: typeof apiKey,
    length: key.length,
    trimmed: key,
    startsWithAIza: key.startsWith('AIza')
  });

  const isValid = (
    typeof apiKey === 'string' &&
    key.length > 10 && // 至少10个字符
    (key.startsWith('AIza') || key.startsWith('ya29')) // Google API Key格式
  );

  console.log('🔑 API Key验证结果:', isValid);
  return Boolean(isValid);
}

// 翻译文本
async function translateText(text, sourceLanguage, targetLanguage, apiKey) {
  const { apiPreference = 'auto' } = await getSettings();
  for (let attempt = 0; attempt < TRANSLATION_CONFIG.MAX_RETRIES; attempt++) {
    try {
      // 明确选择策略
      if (apiPreference === 'v2') {
        if (!isValidApiKey(apiKey)) throw new Error('需要有效的 API Key 才能使用 v2');
        console.log('🔑 按偏好使用官方API (v2)');
        LAST_API_SOURCE = 'v2';
        return await translateWithOfficialAPI(text, sourceLanguage, targetLanguage, apiKey);
      }
      if (apiPreference === 'free') {
        console.log('🆓 按偏好使用免费API');
        LAST_API_SOURCE = 'free';
        return await translateWithFreeAPI(text, sourceLanguage, targetLanguage);
      }

      // auto 策略：有 key 优先 v2，否则 free
      if (isValidApiKey(apiKey)) {
        console.log('🔑 使用官方API翻译 (v2)');
        LAST_API_SOURCE = 'v2';
        return await translateWithOfficialAPI(text, sourceLanguage, targetLanguage, apiKey);
      } else {
        console.log('🆓 使用免费API翻译 (无有效API Key)');
        LAST_API_SOURCE = 'free';
        return await translateWithFreeAPI(text, sourceLanguage, targetLanguage);
      }

    } catch (error) {
      console.warn(`Translation attempt ${attempt + 1} failed:`, error);

      // 如果是官方API失败，尝试切换到免费API
      if (isValidApiKey(apiKey) && attempt === 0) {
        console.log('🔄 官方API失败，尝试免费API');
        try {
          return await translateWithFreeAPI(text, sourceLanguage, targetLanguage);
        } catch (freeApiError) {
          console.warn('免费API也失败:', freeApiError);
        }
      }

      // 如果是官方API失败，尝试切换到免费API
      if (isValidApiKey(apiKey) && attempt === 0) {
        console.log('🔄 官方API失败，尝试免费API');
        try {
          LAST_API_SOURCE = 'free';
          return await translateWithFreeAPI(text, sourceLanguage, targetLanguage);
        } catch (freeApiError) {
          console.warn('免费API也失败:', freeApiError);
        }
      }

      // 如果不是最后一次尝试，等待一段时间后重试
      if (attempt < TRANSLATION_CONFIG.MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // 如果所有翻译方法都失败，返回一个标识性的翻译
  console.error('❌ 所有翻译方法都失败，返回备用翻译');
  return `[翻译失败: ${text}]`;
}

// 使用官方Google Translate API
async function translateWithOfficialAPI(text, sourceLanguage, targetLanguage, apiKey) {
  const url = `${TRANSLATION_CONFIG.GOOGLE_TRANSLATE_API_V2}?key=${apiKey}`;

  const requestBody = {
    q: text,
    source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
    target: targetLanguage,
    format: 'text'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();

  if (data.data && data.data.translations && data.data.translations[0]) {
    return data.data.translations[0].translatedText;
  } else {
    throw new Error('Invalid API response format');
  }
}

// 使用免费Google Translate端点
async function translateWithFreeAPI(text, sourceLanguage, targetLanguage) {
  console.log(`🔄 免费API翻译: "${text}" (${sourceLanguage} -> ${targetLanguage})`);

  const url = new URL(TRANSLATION_CONFIG.GOOGLE_TRANSLATE_FREE);
  url.searchParams.append('client', 'gtx');
  url.searchParams.append('sl', sourceLanguage);
  url.searchParams.append('tl', targetLanguage);
  url.searchParams.append('dt', 't');
  url.searchParams.append('q', text);

  console.log(`📡 请求URL: ${url.toString()}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    console.log(`📥 响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📊 响应数据:', data);

    // 解析免费API响应
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      const translation = data[0][0][0];
      console.log(`✅ 翻译成功: "${translation}"`);
      return translation;
    } else {
      console.error('❌ 响应格式错误:', data);
      throw new Error('Invalid free API response format');
    }
  } catch (error) {
    console.error('❌ 免费API翻译失败:', error);
    throw error;
  }
}

// 批量翻译文本
async function batchTranslateTexts(texts, sourceLanguage, targetLanguage, apiKey) {
  if (isValidApiKey(apiKey)) {
    console.log('🔑 使用官方API批量翻译');
    return await batchTranslateWithOfficialAPI(texts, sourceLanguage, targetLanguage, apiKey);
  } else {
    console.log('🆓 使用免费API逐个翻译');
    // 免费API不支持批量，逐个翻译
    const translations = [];
    for (const text of texts) {
      const translation = await translateWithFreeAPI(text, sourceLanguage, targetLanguage);
      translations.push(translation);
    }
    return translations;
  }
}

// 使用官方API批量翻译
async function batchTranslateWithOfficialAPI(texts, sourceLanguage, targetLanguage, apiKey) {
  const url = `${TRANSLATION_CONFIG.GOOGLE_TRANSLATE_API_V2}?key=${apiKey}`;

  const requestBody = {
    q: texts,
    source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
    target: targetLanguage,
    format: 'text'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();

  if (data.data && data.data.translations) {
    return data.data.translations.map(t => t.translatedText);
  } else {
    throw new Error('Invalid batch API response format');
  }
}

// 获取缓存的翻译
async function getCachedTranslation(cacheKey, cacheTimeHours = 24) {
  return new Promise((resolve) => {
    chrome.storage.local.get([cacheKey], (result) => {
      const cached = result[cacheKey];
      const cacheExpiry = cacheTimeHours * 60 * 60 * 1000; // 转换为毫秒

      if (cached && Date.now() - cached.timestamp < cacheExpiry) {
        resolve(cached);
      } else {
        // 如果缓存过期，删除它
        if (cached) {
          chrome.storage.local.remove([cacheKey]);
        }
        resolve(null);
      }
    });
  });
}

// 缓存翻译结果
async function cacheTranslation(cacheKey, translation, cacheTimeHours = 24, apiSource = null) {
  const cacheData = {
    translation,
    timestamp: Date.now(),
    expiry: Date.now() + (cacheTimeHours * 60 * 60 * 1000),
    apiSource
  };

  chrome.storage.local.set({ [cacheKey]: cacheData });
}

// 处理获取缓存翻译的请求
async function handleGetCachedTranslation(request, sendResponse) {
  const cached = await getCachedTranslation(request.cacheKey);
  sendResponse({ cached });
}

// 处理清除缓存的请求
function handleClearCache(sendResponse) {
  chrome.storage.local.clear(() => {
    console.log('Translation cache cleared');
    sendResponse({ success: true });
  });
}

// 获取用户设置
async function getSettings() {
  return new Promise((resolve) => {
    const defaultSettings = {
      enabled: true,
      targetLanguage: 'zh-CN',
      displayPosition: 'bottom',
      fontSize: 'medium',
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
      animationEnabled: true,
      translationDelay: 50,
      hideYouTubeCaptions: true,
      apiPreference: 'auto'
    };

    chrome.storage.sync.get(defaultSettings, (settings) => {
      // 确保API Key为空字符串时被正确处理
      if (!settings.apiKey || settings.apiKey.trim() === '') {
        settings.apiKey = '';
      }
      resolve(settings);
    });
  });
}

// 处理获取设置的请求
async function handleGetSettings(sendResponse) {
  try {
    const settings = await getSettings();
    sendResponse({ success: true, settings });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// 清理过期缓存（定期执行）
async function cleanExpiredCache() {
  chrome.storage.local.get(null, (items) => {
    const keysToRemove = [];
    const now = Date.now();

    for (const [key, value] of Object.entries(items)) {
      if (value && value.expiry && now > value.expiry) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      chrome.storage.local.remove(keysToRemove, () => {
        console.log(`Cleaned ${keysToRemove.length} expired cache entries`);
      });
    }
  });
  }


// 兼容测试环境导出可测试的函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isValidApiKey, translateWithFreeAPI, translateText };
}

// 每小时清理一次过期缓存（仅在扩展Service Worker环境）
if (__IS_EXTENSION_ENV__ && typeof window === 'undefined') {
  setInterval(cleanExpiredCache, 60 * 60 * 1000);
}

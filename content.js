// content.js - 主要的内容脚本，处理YouTube页面的字幕提取和双语显示

if (typeof window !== 'undefined') {
  console.log('🚀 Content Script 开始加载...');
  console.log('📍 当前页面:', window.location.href);
}

class BilingualSubtitles {
  constructor(options = {}) {
    this.options = options;
    this.settings = {
      enabled: true,
      targetLanguage: 'zh-CN',
      displayPosition: 'bottom',
      fontSize: 'medium',
      apiKey: '',
      cacheTime: 24,
      preTranslate: true,
      showOriginal: true,
      animationEnabled: true,
      translationDelay: 50,
      hideYouTubeCaptions: true
    };

    this.currentSubtitles = [];
    this.subtitleContainer = null;
    this.observer = null;
    this.videoElement = null;
    this.lastSubtitleText = '';
    this.translationQueue = new Map(); // 翻译队列
    this.translationCache = new Map(); // 内存缓存
    this.maxCacheSize = 100; // 最大缓存条目数
    this.extractTimeout = null;
    this.periodicCheckInterval = null;
    this.loadingIndicatorTimeout = null;
    this.lastApiSource = null;

    // DOM 引用与渲染控制
    this.dom = { originalEl: null, translatedEl: null };
    this.loadingTimerId = null;
    this.requestSeq = 0; // 当前翻译请求序号，用于避免过期渲染

    // 健康监控与观察器
    this.healthCheckInterval = null;
    this.playerObserver = null;
    this.captionsObserver = null;


    if (!this.options.skipInit) {
      this.init();
    }
  }

  async init() {
    console.log('YouTube双语字幕插件初始化...');

    // 加载用户设置
    await this.loadSettings();

    // 等待页面加载完成
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPlugin());
    } else if (typeof document !== 'undefined') {
      this.setupPlugin();
    }

    // 监听消息
    this.setupMessageListener();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(this.settings, (settings) => {
        this.settings = settings;
        resolve();
      });
    });
  }

  setupPlugin() {
    // 检查是否在YouTube视频页面
    if (!this.isYouTubeVideoPage()) {
      return;
    }

    // 等待视频播放器加载
    this.waitForVideoPlayer().then(() => {
      if (this.settings.enabled) {
        this.startSubtitleExtraction();
      }
    });
  }

  isYouTubeVideoPage() {
    return window.location.pathname === '/watch' && window.location.search.includes('v=');
  }

  async waitForVideoPlayer() {
    return new Promise((resolve) => {
      const checkPlayer = () => {
        const player = document.querySelector('.html5-video-player');
        const video = document.querySelector('video');

        if (player && video) {
          this.videoElement = video;
          resolve();
        } else {
          setTimeout(checkPlayer, 500);
        }
      };

      checkPlayer();
    });
  }

  startSubtitleExtraction() {
    console.log('开始字幕提取...');

    // 创建字幕显示容器
    this.createSubtitleContainer();

    // 为跳转/倍速建立保护
    this.setupPlaybackEventGuards();

    // 监听字幕变化
    this.observeSubtitleChanges();

    // 监听视频时间变化
    this.setupVideoTimeListener();

    // 设置定期清理
    this.setupPeriodicCleanup();

    // 启动健康自检
    this.setupHealthMonitor();
  }


  createSubtitleContainer() {
    // 移除已存在的容器
    const existing = document.querySelector('.bilingual-subtitles-container');
    if (existing) {
      existing.classList.add('fade-out');
      setTimeout(() => existing.remove(), 300);
    }

    // 创建新容器
    this.subtitleContainer = document.createElement('div');
    this.subtitleContainer.className = `bilingual-subtitles-container position-${this.settings.displayPosition} size-${this.settings.fontSize} ${this.settings.animationEnabled ? 'animations-enabled' : 'animations-disabled'}`;

    // 添加到视频播放器
    const player = document.querySelector('.html5-video-player');
    if (player) {
      // 覆盖模式时隐藏原生字幕；或当设置强制隐藏时也隐藏
      const overlay = this.settings.displayPosition === 'overlay';


      if (overlay) {
        player.classList.add('bilingual-subtitles-overlay-mode');
      } else {
        player.classList.remove('bilingual-subtitles-overlay-mode');
      }
      if (this.settings.hideYouTubeCaptions) {
        player.classList.add('bilingual-subtitles-hide-native');
      } else {
        player.classList.remove('bilingual-subtitles-hide-native');
      }

      player.appendChild(this.subtitleContainer);
      console.log('📦 容器已添加到播放器');

      // 触发淡入动画
      setTimeout(() => {
        this.subtitleContainer.classList.add('fade-in');
        console.log('✨ 淡入动画已触发');
        console.log('🔍 容器最终状态:', {
          container: !!this.subtitleContainer,
          inDOM: document.body.contains(this.subtitleContainer),
          visible: this.subtitleContainer.style.display !== 'none',
          hasContent: this.subtitleContainer.childElementCount > 0,
          className: this.subtitleContainer.className
        });
      }, 50);
    }
  }

  observeSubtitleChanges() {
    // 多种方式观察YouTube字幕变化
    this.setupMultipleSubtitleObservers();

    // 定期检查字幕变化（备用方案）
    this.setupPeriodicCheck();
  }

  setupMultipleSubtitleObservers() {
    // 方法1: 观察字幕窗口容器
    const captionContainer = document.querySelector('.ytp-caption-window-container');
    if (captionContainer) {
      this.observer = new MutationObserver((mutations) => {
        this.handleSubtitleMutation(mutations);
      });

      this.observer.observe(captionContainer, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
    }

    // 方法2: 观察整个播放器区域（更广泛的监听）
    const player = document.querySelector('.html5-video-player');
    if (player && !this.observer) {
      this.observer = new MutationObserver((mutations) => {
        this.handleSubtitleMutation(mutations);
      });

      this.observer.observe(player, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  handleSubtitleMutation(mutations) {
    let shouldExtract = false;

    mutations.forEach((mutation) => {
      // 检查是否是字幕相关的变化
      if (mutation.type === 'childList') {
        const target = mutation.target;
        if (target.classList && (
          target.classList.contains('captions-text') ||
          target.classList.contains('ytp-caption-window-container') ||
          (typeof target.closest === 'function' && target.closest('.ytp-caption-window-container'))
        )) {
          shouldExtract = true;
        }
      } else if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        if (parent && typeof parent.closest === 'function' && parent.closest('.ytp-caption-window-container')) {
          shouldExtract = true;
        }
      }
    });


    if (shouldExtract) {
      // 防抖处理，避免频繁调用
      clearTimeout(this.extractTimeout);
      this.extractTimeout = setTimeout(() => {
        this.extractCurrentSubtitle();
      }, 50); // 减少延迟到50ms以提高实时性
    }
  }

  setupPeriodicCheck() {
    // 每200ms检查一次字幕变化（更频繁的检查以确保实时性）
    this.periodicCheckInterval = setInterval(() => {
      this.extractCurrentSubtitle();
    }, 200);
  }

  setupPeriodicCleanup() {
    // 每5分钟清理一次内存缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanupMemoryCache();
    }, 5 * 60 * 1000);
  }

  // 重新挂载字幕观察器（用于 seek/倍速后 DOM 变化）
  reattachObservers() {
    console.log('🔧 重新挂载观察器');
    try { if (this.observer) this.observer.disconnect(); } catch (_e) {}
    this.observer = null;

    // 等待一小段时间让YouTube DOM稳定
    setTimeout(() => {
      this.setupMultipleSubtitleObservers();
      console.log('✅ 观察器重新挂载完成');
    }, 100);

    if (!this.periodicCheckInterval) {
      console.log('🔄 重启周期检查');
      this.setupPeriodicCheck();
    }
  }

  // 健康自检：原生有字幕但我们没渲染时自愈
  setupHealthMonitor() {
    clearInterval(this.healthCheckInterval);
    this.healthCheckInterval = setInterval(() => {
      if (!this.isYouTubeVideoPage() || !this.settings.enabled) return;

      const ytElement = document.querySelector('.ytp-caption-window-container .ytp-caption-segment, .ytp-caption-window-container .captions-text, .ytp-player-captions .captions-text, .ytp-player-captions .ytp-caption-segment');
      const ytText = ytElement ? ytElement.textContent.trim() : '';
      const oursHas = !!(this.subtitleContainer && this.subtitleContainer.childElementCount > 0);

      // 检查原生字幕文本是否与我们显示的不同
      const textMismatch = ytText && ytText !== this.lastSubtitleText;

      if (ytText && (!oursHas || textMismatch)) {
        console.log('🚨 健康自检：字幕不同步，开始自愈');
        console.log('📊 原生字幕:', ytText, 'vs 我们的:', this.lastSubtitleText);
        console.log('🧹 健康自检：强制重置 lastSubtitleText');
        this.lastSubtitleText = ''; // 强制重置，确保下次提取会被认为是新字幕
        if (!this.subtitleContainer || !document.body.contains(this.subtitleContainer)) {
          this.createSubtitleContainer();
        }
        this.reattachObservers();
        this.extractCurrentSubtitle();
      }

      const player = document.querySelector('.html5-video-player');
      if (player) {
        const overlay = this.settings.displayPosition === 'overlay';
        player.classList.toggle('bilingual-subtitles-overlay-mode', overlay);
        player.classList.toggle('bilingual-subtitles-hide-native', !!this.settings.hideYouTubeCaptions);
      }
    }, 2000); // 缩短检查间隔到2秒
  }

  // 处理跳转/倍速等导致丢字幕的情况
  setupPlaybackEventGuards() {
    if (!this.videoElement) return;

    // 在 seek 前后，短暂暂停提取并清理状态，避免抓到过期 DOM
    const onSeeking = () => {
      console.log('⏸️ Seeking event - 暂停字幕提取');
      clearTimeout(this.extractTimeout);
      this.extractTimeout = null;
      this.lastSubtitleText = '';
      this.clearSubtitleDisplay();
      // 暂停周期检查，避免在跳转瞬间误判
      if (this.periodicCheckInterval) { clearInterval(this.periodicCheckInterval); this.periodicCheckInterval = null; }
      // 断开旧观察器，等待重建
      if (this.observer) { try { this.observer.disconnect(); } catch (_e) {} this.observer = null; }
    };

    const onSeeked = () => {
      console.log('🔄 Seeked event - 开始恢复字幕提取');
      console.log('🧹 强制重置 lastSubtitleText');
      this.lastSubtitleText = ''; // 强制重置，确保下次提取会被认为是新字幕

      // 强制重新创建容器，确保跳转后显示正常
      console.log('🔨 跳转后强制重新创建容器');
      this.createSubtitleContainer();

      // 跳转后重新挂载观察器与周期检查
      this.reattachObservers();
      if (!this.periodicCheckInterval) {
        this.setupPeriodicCheck();
      }

      // 延迟更长时间再提取，让YouTube字幕稳定
      setTimeout(() => {
        console.log('🔍 第1次尝试提取字幕, lastSubtitleText:', this.lastSubtitleText);
        this.extractCurrentSubtitle();
      }, 300);

      // 再次尝试，确保能捕获到正确的字幕
      setTimeout(() => {
        console.log('🔍 第2次尝试提取字幕, lastSubtitleText:', this.lastSubtitleText);
        this.extractCurrentSubtitle();
      }, 800);
    };

    const onRateChange = () => {
      // 倍速变化时也重置一次状态，确保能继续提取
      this.reattachObservers();
      setTimeout(() => this.extractCurrentSubtitle(), 80);
    };

    console.log('🎯 设置播放事件监听器，videoElement:', this.videoElement);
    this.videoElement.addEventListener('seeking', onSeeking);
    this.videoElement.addEventListener('seeked', onSeeked);
    this.videoElement.addEventListener('ratechange', onRateChange);

    // 测试事件是否正常工作
    this.videoElement.addEventListener('timeupdate', () => {
      // 每10秒输出一次，确认事件监听正常
      if (Math.floor(this.videoElement.currentTime) % 10 === 0) {
        console.log('⏰ 时间更新事件正常，当前时间:', this.videoElement.currentTime);
      }
    });
  }


  setupVideoTimeListener() {
    if (this.videoElement) {
      this.videoElement.addEventListener('timeupdate', () => {
        // 预翻译功能：如果启用了预翻译，尝试获取即将出现的字幕
        if (this.settings.preTranslate) {
          this.preTranslateUpcomingSubtitles();
        }
      });
    }
  }

  preTranslateUpcomingSubtitles() {
    // 这是一个简化的预翻译实现
    // 在实际应用中，可以通过分析字幕时间轴来预测即将出现的字幕

    // 获取所有可能的字幕元素
    const allCaptionElements = document.querySelectorAll('.ytp-caption-window-container span, .ytp-caption-segment');

    if (allCaptionElements.length > 0) {
      const upcomingTexts = [];

      allCaptionElements.forEach(element => {
        const text = element.textContent.trim();
        if (text && text !== this.lastSubtitleText) {
          upcomingTexts.push(text);
        }
      });

      // 批量预翻译（限制数量以避免过多API调用）
      if (upcomingTexts.length > 0) {
        this.batchPreTranslate(upcomingTexts.slice(0, 5)); // 最多预翻译5个
      }
    }
  }

  async batchPreTranslate(texts) {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'TRANSLATE_BATCH',
          texts: texts,
          targetLanguage: this.settings.targetLanguage
        }, resolve);

    // 渲染前确保容器存在且可见
    this.ensureContainerVisible?.();

      });

      if (response && response.success) {
        // 预翻译成功，结果已经被缓存
        console.log(`预翻译完成: ${texts.length} 个字幕`);
      }
    } catch (error) {
      console.warn('预翻译失败:', error);
    }
  }

  extractCurrentSubtitle() {
    console.log('🔍 开始提取字幕');
    // 尝试多种选择器来获取字幕文本
    const selectors = [
      '.ytp-caption-window-container .captions-text',
      '.ytp-caption-window-container .ytp-caption-segment',
      '.caption-window .caption-visual-line'
    ];

    let subtitleText = '';

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        subtitleText = element.textContent.trim();
        console.log(`📝 找到字幕文本 (${selector}):`, subtitleText);
        if (subtitleText) break;
      }
    }

    if (!subtitleText) {
      console.log('❌ 未找到字幕文本');
      // 如果没找到字幕，检查是否有隐藏的字幕元素
      const hiddenElements = document.querySelectorAll('.ytp-caption-window-container [style*="display: none"], .ytp-caption-window-container [hidden]');
      if (hiddenElements.length > 0) {
        console.log('🔍 发现隐藏的字幕元素:', hiddenElements.length);
      }
    }

    // 过滤异常文本（防止捕获整页HTML或过长内容）
    if (subtitleText && (subtitleText.length > 300 || subtitleText.includes('<') || subtitleText.includes('>'))) {
      console.warn('忽略可疑字幕文本（过长或包含HTML标记）', { length: subtitleText.length });
      return;
    }

    if (subtitleText && subtitleText !== this.lastSubtitleText) {
      console.log('✅ 新字幕文本，开始翻译:', subtitleText);
      console.log('📊 lastSubtitleText 从', this.lastSubtitleText, '更新为', subtitleText);
      this.lastSubtitleText = subtitleText;
      this.displayBilingualSubtitle(subtitleText);
    } else if (!subtitleText && this.lastSubtitleText) {
      // 如果没有字幕了，清空显示
      console.log('🧹 清空字幕显示');
      this.lastSubtitleText = '';
      this.clearSubtitleDisplay();
    } else {
      console.log('⏸️ 字幕无变化或为空, 当前:', subtitleText, 'vs 上次:', this.lastSubtitleText);
    }
  }

  async displayBilingualSubtitle(originalText) {
    console.log('🎨 开始显示双语字幕:', originalText);
    // 若容器缺失或被移除，先自愈创建
    if (!this.subtitleContainer || !document.body.contains(this.subtitleContainer)) {
      console.log('🔧 容器缺失，重新创建');
      this.createSubtitleContainer();
    }
    if (!this.subtitleContainer) {
      console.log('❌ 容器创建失败');
      return;
    }

    // 检查内存缓存
    const cacheKey = `${this.settings.targetLanguage}-${originalText}`;
    const cachedTranslation = this.translationCache.get(cacheKey);

    if (cachedTranslation) {
      // 记录缓存命中（容错处理：仅在监控可用时使用）
      try { window.performanceMonitor?.startTranslation?.(originalText)?.finish?.(true, true); } catch (_e) {}

      console.log('💾 使用缓存翻译:', cachedTranslation);
      // 直接显示缓存的翻译
      this.subtitleContainer.innerHTML = `
        <div class=\"original-subtitle\">${this.escapeHtml(originalText)}</div>
        <div class=\"translated-subtitle\">${this.escapeHtml(cachedTranslation)}</div>
      `;
      console.log('✅ 缓存翻译已渲染到容器');
      console.log('🔍 容器状态检查:', {
        container: !!this.subtitleContainer,
        inDOM: document.body.contains(this.subtitleContainer),
        visible: this.subtitleContainer.style.display !== 'none',
        hasContent: this.subtitleContainer.childElementCount > 0,
        className: this.subtitleContainer.className,
        computedStyle: window.getComputedStyle(this.subtitleContainer).display,
        position: window.getComputedStyle(this.subtitleContainer).position,
        zIndex: window.getComputedStyle(this.subtitleContainer).zIndex,
        opacity: window.getComputedStyle(this.subtitleContainer).opacity
      });

      // 强制确保容器可见
      this.subtitleContainer.style.display = 'block';
      this.subtitleContainer.style.visibility = 'visible';
      this.subtitleContainer.style.opacity = '1';
      console.log('🔧 强制设置容器可见性');
      // 异步标记来源
      this.fetchLastApiSource().then((source) => {
        const el = this.subtitleContainer?.querySelector('.translated-subtitle');
        if (el && this.lastSubtitleText === originalText) {
          el.setAttribute('data-source', source ? `(${source})` : '');
        }
      });
      return;
    }

    // 首次渲染：只在必要时更新DOM，保留已存在的元素，避免闪烁
    const needsFresh = !this.dom.originalEl || !this.dom.translatedEl ||
      this.subtitleContainer.innerHTML.trim() === '';

    if (needsFresh) {
      this.subtitleContainer.innerHTML = `
        <div class="original-subtitle"></div>
        <div class="translated-subtitle loading" style="display:none"></div>
      `;
      this.dom.originalEl = this.subtitleContainer.querySelector('.original-subtitle');
      this.dom.translatedEl = this.subtitleContainer.querySelector('.translated-subtitle');
    } else {
      this.dom.translatedEl.classList.remove('success', 'error');
      this.dom.translatedEl.classList.add('loading');
      this.dom.translatedEl.removeAttribute('data-source');
    }

    // 更新原文文本（只在变更时写入）
    if (this.dom.originalEl.textContent !== originalText) {
      this.dom.originalEl.textContent = originalText;
    }

    // 控制“翻译中...”延迟展示窗口
    clearTimeout(this.loadingTimerId);
    this.dom.translatedEl.style.display = 'none';
    this.loadingTimerId = setTimeout(() => {
      if (this.lastSubtitleText === originalText && this.dom.translatedEl) {
        this.dom.translatedEl.textContent = '翻译中...';
        this.dom.translatedEl.style.display = 'inline-block';
      }
    }, Math.max(120, this.settings.translationDelay || 0));

    try {
      // 如果已有相同文本的翻译在进行中，则共用结果，避免重复请求
      if (this.translationQueue.has(cacheKey)) {
        const translation = await this.translationQueue.get(cacheKey);
        if (this.lastSubtitleText === originalText) {
          this.displayTranslationResult(originalText, translation);
        }
        return;
      }

      // 开始性能监控（容错）
      let perfTracker = null;
      try { perfTracker = window.performanceMonitor?.startTranslation?.(originalText) || null; } catch (_e) {}

      // 生成本次请求序号，用于过期保护
      const seq = ++this.requestSeq;

      // 发起翻译请求并入队
      const translationPromise = this.translateText(originalText);
      this.translationQueue.set(cacheKey, translationPromise);

      const translation = await translationPromise;

      // 如果期间原文已经变了，不再渲染，直接退出（并且让下一个请求接管）
      if (this.lastSubtitleText !== originalText || seq !== this.requestSeq) {
        this.translationQueue.delete(cacheKey);
        return;
      }

      // 结束性能监控
      if (perfTracker) {
        perfTracker.finish(true, false);
      }

      // 缓存翻译结果（带内存管理）
      this.setCacheWithLimit(cacheKey, translation);

      // 从队列中移除
      this.translationQueue.delete(cacheKey);

      // 显示翻译结果（不重建节点，只改文本，避免闪烁）
      this.displayTranslationResult(originalText, translation, { reuseNodes: true });

    } catch (error) {
      console.error('翻译失败:', error);
      this.translationQueue.delete(cacheKey);
      if (this.dom.translatedEl) {
        this.dom.translatedEl.classList.remove('loading');
        this.dom.translatedEl.classList.add('error');
        this.dom.translatedEl.textContent = '翻译失败';
        this.dom.translatedEl.style.display = 'inline-block';
      }
    }
  }

  displayTranslationResult(originalText, translation, opts = {}) {
    console.log('🖼️ 显示翻译结果:', translation);
    if (!this.subtitleContainer || this.lastSubtitleText !== originalText) {
      console.log('❌ 容器不存在或文本已变化，跳过渲染');
      return;
    }

    // 多行标记
    const isMultiline = originalText.includes('\n') || translation.includes('\n');
    this.subtitleContainer.classList.toggle('multiline', isMultiline);

    // 默认复用节点，避免重建DOM造成闪烁
    const reuse = opts.reuseNodes !== false;

    if (reuse && this.dom.originalEl && this.dom.translatedEl) {
      console.log('🔄 复用现有DOM节点');
      // 复用：只改文本与类（避免重排）
      this.dom.translatedEl.classList.remove('loading', 'error');
      if (this.settings.animationEnabled) this.dom.translatedEl.classList.add('success');

      // 仅当文本变化时才写入，减少闪动
      if (this.dom.translatedEl.textContent !== translation) {
        this.dom.translatedEl.textContent = translation;
        console.log('✅ 译文已更新到DOM');
        console.log('🔍 容器状态检查:', {
          container: !!this.subtitleContainer,
          inDOM: document.body.contains(this.subtitleContainer),
          visible: this.subtitleContainer.style.display !== 'none',
          hasContent: this.subtitleContainer.childElementCount > 0,
          className: this.subtitleContainer.className,
          computedStyle: window.getComputedStyle(this.subtitleContainer).display,
          position: window.getComputedStyle(this.subtitleContainer).position,
          zIndex: window.getComputedStyle(this.subtitleContainer).zIndex,
          opacity: window.getComputedStyle(this.subtitleContainer).opacity
        });

        // 强制确保容器可见
        this.subtitleContainer.style.display = 'block';
        this.subtitleContainer.style.visibility = 'visible';
        this.subtitleContainer.style.opacity = '1';
        console.log('🔧 强制设置容器可见性');
      }
      this.dom.translatedEl.style.display = 'inline-block';
      // 异步来源标记
      this.fetchLastApiSource().then((source) => {
        if (this.lastSubtitleText === originalText && this.dom.translatedEl) {
          this.dom.translatedEl.setAttribute('data-source', source ? `(${source})` : '');
        }
      });
      // 清理loading定时器
      clearTimeout(this.loadingTimerId);

      // 短暂的成功动画，然后移除类以便下次触发
      setTimeout(() => this.dom.translatedEl && this.dom.translatedEl.classList.remove('success'), 500);
      return;
    }

    // 回退：重建DOM（极少路径）
    console.log('🔨 重建DOM结构');
    this.subtitleContainer.innerHTML = `
      <div class=\"original-subtitle\">${this.escapeHtml(originalText)}</div>
      <div class=\"translated-subtitle success\">${this.escapeHtml(translation)}</div>
    `;
    this.dom.originalEl = this.subtitleContainer.querySelector('.original-subtitle');
    this.dom.translatedEl = this.subtitleContainer.querySelector('.translated-subtitle');
    console.log('✅ DOM重建完成');

    this.fetchLastApiSource().then((source) => {
      if (this.lastSubtitleText === originalText && this.dom.translatedEl) {
        this.dom.translatedEl.setAttribute('data-source', source ? `(${source})` : '');
      }
    });

    setTimeout(() => this.dom.translatedEl && this.dom.translatedEl.classList.remove('success'), 500);
  }

  // 查询最近一次使用的翻译API来源
  async fetchLastApiSource() {
    try {
      // 若已缓存，直接返回
      if (this.lastApiSource) return this.lastApiSource;
      const res = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_LAST_API_SOURCE' }, resolve);
      });
      if (res && res.success) {
        this.lastApiSource = res.source;
        return res.source;
      }
    } catch (_e) { /* ignore */ }
    return null;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 带限制的缓存设置
  setCacheWithLimit(key, value) {
    // 如果缓存已满，删除最旧的条目
    if (this.translationCache.size >= this.maxCacheSize) {
      const firstKey = this.translationCache.keys().next().value;
      this.translationCache.delete(firstKey);
    }

    this.translationCache.set(key, value);
  }

  // 清理过期的内存缓存
  cleanupMemoryCache() {
    // 定期清理，保持缓存大小在合理范围内
    if (this.translationCache.size > this.maxCacheSize * 1.5) {
      const keysToDelete = [];
      let count = 0;

      for (const key of this.translationCache.keys()) {
        if (count >= this.maxCacheSize) {
          keysToDelete.push(key);
        }
        count++;
      }

      keysToDelete.forEach(key => this.translationCache.delete(key));
      console.log(`清理了 ${keysToDelete.length} 个过期缓存条目`);
    }
  }

  async translateText(text) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'TRANSLATE_TEXT',
        text: text,
        targetLanguage: this.settings.targetLanguage
      }, (response) => {
        if (response && response.success) {
          resolve(response.translation);
        } else {
          reject(new Error(response?.error || '翻译服务不可用'));
        }
      });
    });
  }

  clearSubtitleDisplay() {
    if (this.subtitleContainer) {
      // 添加淡出效果
      this.subtitleContainer.classList.remove('fade-in');
      this.subtitleContainer.classList.add('fade-out');

      setTimeout(() => {
        if (this.subtitleContainer) {
          this.subtitleContainer.innerHTML = '';
          this.subtitleContainer.classList.remove('fade-out');
        }
      }, 300);
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request) => {
      switch (request.type) {
        case 'SETTINGS_UPDATED':
          this.handleSettingsUpdate(request.settings);
          break;
      }
    });
  }

  handleSettingsUpdate(newSettings) {
    this.settings = { ...this.settings, ...newSettings };

    if (this.settings.enabled) {
      this.startSubtitleExtraction();
    } else {
      this.stopSubtitleExtraction();
    }

    // 更新容器样式
    if (this.subtitleContainer) {
      this.subtitleContainer.className = `bilingual-subtitles-container position-${this.settings.displayPosition} size-${this.settings.fontSize} ${this.settings.animationEnabled ? 'animations-enabled' : 'animations-disabled'}`;
      // 同步原生字幕隐藏状态
      const player = document.querySelector('.html5-video-player');
      if (player) {
        const overlay = this.settings.displayPosition === 'overlay';
        player.classList.toggle('bilingual-subtitles-overlay-mode', overlay);
        player.classList.toggle('bilingual-subtitles-hide-native', !!this.settings.hideYouTubeCaptions);
      }
    }
  }

  stopSubtitleExtraction() {
    // 清理观察器
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // 清理定时器
    if (this.extractTimeout) {
      clearTimeout(this.extractTimeout);
      this.extractTimeout = null;
    }

    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // 清理缓存和队列
    this.translationCache.clear();
    this.translationQueue.clear();

    // 清理显示
    this.clearSubtitleDisplay();
  }
}

// 初始化插件（仅在扩展环境中）
if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('🔧 正在初始化 BilingualSubtitles...');
  const bilingualSubtitles = new BilingualSubtitles();
  console.log('✅ BilingualSubtitles 初始化完成');

  // 添加到全局作用域以便调试
  try {
    window.BilingualSubtitles = BilingualSubtitles;
    window.bilingualSubtitles = bilingualSubtitles;
  } catch (_e) {}

  console.log('🎉 Content Script 加载完成!');
}

// 兼容测试环境导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BilingualSubtitles };
}

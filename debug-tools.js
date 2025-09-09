// debug-tools.js - 调试和测试工具

console.log('🔧 Debug Tools 开始加载...');

class DebugTools {
  constructor() {
    this.isDebugMode = localStorage.getItem('youtube-subtitles-debug') === 'true';
    this.testSubtitles = [
      "Hello, welcome to this video tutorial.",
      "Today we're going to learn about JavaScript.",
      "Let's start with the basics of programming.",
      "Variables are used to store data values.",
      "Functions help us organize our code better."
    ];
    
    this.init();
  }

  init() {
    if (this.isDebugMode) {
      this.addDebugUI();
      this.enableConsoleCommands();
      console.log('🐛 调试模式已启用');
    }
  }

  // 添加调试界面
  addDebugUI() {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'youtube-subtitles-debug-panel';
    debugPanel.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 99999;
        max-width: 300px;
        border: 1px solid #333;
      ">
        <h3 style="margin: 0 0 10px 0; color: #4CAF50;">🐛 调试面板</h3>
        <div id="debug-status">状态: 等待中...</div>
        <div id="debug-stats" style="margin-top: 10px;">
          <div>翻译请求: <span id="translation-count">0</span></div>
          <div>缓存命中: <span id="cache-hits">0</span></div>
          <div>错误次数: <span id="error-count">0</span></div>
        </div>
        <div style="margin-top: 10px;">
          <button onclick="window.debugTools.testTranslation()" style="
            background: #2196F3;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 5px;
          ">测试翻译</button>
          <button onclick="window.debugTools.simulateSubtitles()" style="
            background: #FF9800;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 5px;
          ">模拟字幕</button>
          <button onclick="window.debugTools.clearAllCache()" style="
            background: #f44336;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
          ">清除缓存</button>
        </div>
        <div style="margin-top: 10px;">
          <button onclick="window.debugTools.togglePanel()" style="
            background: #666;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
          ">隐藏面板</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(debugPanel);
    this.debugPanel = debugPanel;
    
    // 定期更新统计信息
    setInterval(() => this.updateStats(), 1000);
  }

  // 更新统计信息
  updateStats() {
    if (!window.performanceMonitor) return;
    
    const report = window.performanceMonitor.getReport();
    
    const translationCountEl = document.getElementById('translation-count');
    const cacheHitsEl = document.getElementById('cache-hits');
    const errorCountEl = document.getElementById('error-count');
    
    if (translationCountEl) translationCountEl.textContent = report.summary.totalRequests;
    if (cacheHitsEl) cacheHitsEl.textContent = report.details.cacheHits;
    if (errorCountEl) errorCountEl.textContent = report.details.errors;
  }

  // 测试翻译功能
  async testTranslation() {
    const testText = "Hello, this is a test translation.";
    this.updateStatus('测试翻译中...');
    
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'TRANSLATE_TEXT',
          text: testText,
          targetLanguage: 'zh-CN'
        }, resolve);
      });
      
      if (response && response.success) {
        this.updateStatus(`翻译成功: ${response.translation}`);
        console.log('✅ 翻译测试成功:', response);
      } else {
        this.updateStatus('翻译失败');
        console.error('❌ 翻译测试失败:', response);
      }
    } catch (error) {
      this.updateStatus('翻译错误');
      console.error('❌ 翻译测试错误:', error);
    }
  }

  // 模拟字幕显示
  simulateSubtitles() {
    this.updateStatus('模拟字幕中...');
    
    let index = 0;
    const showNextSubtitle = () => {
      if (index >= this.testSubtitles.length) {
        this.updateStatus('模拟完成');
        return;
      }
      
      const subtitle = this.testSubtitles[index];
      this.updateStatus(`显示: ${subtitle.substring(0, 20)}...`);
      
      // 模拟字幕显示
      if (window.bilingualSubtitles) {
        window.bilingualSubtitles.displayBilingualSubtitle(subtitle);
      }
      
      index++;
      setTimeout(showNextSubtitle, 3000); // 每3秒显示下一个
    };
    
    showNextSubtitle();
  }

  // 清除所有缓存
  clearAllCache() {
    this.updateStatus('清除缓存中...');
    
    // 清除内存缓存
    if (window.bilingualSubtitles) {
      window.bilingualSubtitles.translationCache.clear();
      window.bilingualSubtitles.translationQueue.clear();
    }
    
    // 清除本地存储缓存
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, (response) => {
      if (response && response.success) {
        this.updateStatus('缓存已清除');
        console.log('✅ 缓存清除成功');
      } else {
        this.updateStatus('清除失败');
        console.error('❌ 缓存清除失败');
      }
    });
  }

  // 更新状态显示
  updateStatus(message) {
    const statusEl = document.getElementById('debug-status');
    if (statusEl) {
      statusEl.textContent = `状态: ${message}`;
    }
  }

  // 切换调试面板显示
  togglePanel() {
    if (this.debugPanel) {
      const panel = this.debugPanel.querySelector('div');
      if (panel.style.display === 'none') {
        panel.style.display = 'block';
      } else {
        panel.style.display = 'none';
      }
    }
  }

  // 启用控制台命令
  enableConsoleCommands() {
    // 全局调试命令
    window.debugSubtitles = {
      test: () => this.testTranslation(),
      simulate: () => this.simulateSubtitles(),
      clearCache: () => this.clearAllCache(),
      showPanel: () => {
        if (this.debugPanel) {
          this.debugPanel.querySelector('div').style.display = 'block';
        }
      },
      hidePanel: () => {
        if (this.debugPanel) {
          this.debugPanel.querySelector('div').style.display = 'none';
        }
      },
      getSettings: () => {
        if (window.bilingualSubtitles) {
          console.log('当前设置:', window.bilingualSubtitles.settings);
        }
      },
      inspectCache: () => {
        if (window.bilingualSubtitles) {
          console.log('内存缓存:', window.bilingualSubtitles.translationCache);
          console.log('翻译队列:', window.bilingualSubtitles.translationQueue);
        }
      }
    };
    
    console.log('🔧 调试命令已启用:');
    console.log('  debugSubtitles.test() - 测试翻译');
    console.log('  debugSubtitles.simulate() - 模拟字幕');
    console.log('  debugSubtitles.clearCache() - 清除缓存');
    console.log('  debugSubtitles.getSettings() - 查看设置');
    console.log('  debugSubtitles.inspectCache() - 检查缓存');
  }

  // 检查常见问题
  diagnose() {
    const issues = [];
    
    // 检查是否在YouTube视频页面
    if (!window.location.pathname.includes('/watch')) {
      issues.push('不在YouTube视频页面');
    }
    
    // 检查插件是否初始化
    if (!window.bilingualSubtitles) {
      issues.push('插件未初始化');
    }
    
    // 检查是否有字幕容器
    const captionContainer = document.querySelector('.ytp-caption-window-container');
    if (!captionContainer) {
      issues.push('未找到字幕容器');
    }
    
    // 检查设置
    if (window.bilingualSubtitles && !window.bilingualSubtitles.settings.enabled) {
      issues.push('插件已禁用');
    }
    
    return issues;
  }
}

// 创建调试工具实例
window.debugTools = new DebugTools();

// 启用调试模式的方法
window.enableDebugMode = () => {
  localStorage.setItem('youtube-subtitles-debug', 'true');
  location.reload();
};

window.disableDebugMode = () => {
  localStorage.setItem('youtube-subtitles-debug', 'false');
  location.reload();
};

console.log('🔧 调试工具已加载。使用 enableDebugMode() 启用调试模式');
console.log('✅ Debug Tools 加载完成!');

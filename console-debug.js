// console-debug.js - 直接在控制台运行的调试脚本
// 复制粘贴到Chrome控制台中运行

(function() {
  console.log('🔧 YouTube双语字幕调试工具');
  console.log('='.repeat(40));

  // 检查环境
  function checkEnvironment() {
    console.log('📊 环境检查:');
    console.log('- 当前URL:', window.location.href);
    console.log('- 是否YouTube视频页面:', window.location.href.includes('/watch'));
    console.log('- Chrome扩展API可用:', typeof chrome !== 'undefined');
    console.log('- Chrome Runtime可用:', typeof chrome?.runtime !== 'undefined');

    if (!window.location.href.includes('/watch')) {
      console.warn('⚠️ 请在YouTube视频页面运行此脚本');
      return false;
    }

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('❌ Chrome扩展API不可用');
      return false;
    }

    return true;
  }

  // 测试扩展通信
  async function testExtension() {
    console.log('📡 测试扩展通信...');

    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('请求超时'));
        }, 5000);

        chrome.runtime.sendMessage({
          type: 'GET_SETTINGS'
        }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      console.log('✅ 扩展通信成功:', response);

      if (response && response.success) {
        console.log('🔑 API Key状态:', response.settings.apiKey ? '已配置' : '未配置');
        console.log('🌐 目标语言:', response.settings.targetLanguage);
        console.log('📍 显示位置:', response.settings.displayPosition);
      }

      return response;

    } catch (error) {
      console.error('❌ 扩展通信失败:', error.message);
      console.log('💡 可能的原因:');
      console.log('  1. 插件未正确安装或启用');
      console.log('  2. 插件有错误导致background script崩溃');
      console.log('  3. 权限问题');
      return null;
    }
  }

  // 测试翻译功能
  async function testTranslation() {
    console.log('🔄 测试翻译功能...');

    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('翻译请求超时'));
        }, 10000);

        chrome.runtime.sendMessage({
          type: 'TRANSLATE_TEXT',
          text: 'Hello world',
          targetLanguage: 'zh-CN',
          sourceLanguage: 'en'
        }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      if (response && response.success) {
        console.log('✅ 翻译成功:', response.translation);
        console.log('📊 数据来源:', response.fromCache ? '缓存' : '实时翻译');
      } else {
        console.error('❌ 翻译失败:', response?.error || '未知错误');
      }

      return response;

    } catch (error) {
      console.error('❌ 翻译测试失败:', error.message);
      return null;
    }
  }

  // 检查字幕元素
  function checkSubtitles() {
    console.log('🎬 检查字幕元素...');

    const selectors = [
      '.ytp-caption-segment',
      '.captions-text',
      '.ytp-caption-window-container .ytp-caption-segment',
      '.ytp-caption-window-container',
      '[class*="caption"]'
    ];

    let found = false;
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ 找到字幕元素 ${selector}: ${elements.length} 个`);
        console.log('   内容示例:', elements[0].textContent?.substring(0, 50) + '...');
        found = true;
      } else {
        console.log(`❌ 未找到 ${selector}`);
      }
    });

    if (!found) {
      console.warn('⚠️ 未找到任何字幕元素，请确保:');
      console.log('  1. 视频正在播放');
      console.log('  2. 已开启字幕 (CC按钮)');
      console.log('  3. 视频有可用的字幕');
    }

    return found;
  }

  // 启用调试模式
  function enableDebugMode() {
    console.log('🐛 启用调试模式...');
    localStorage.setItem('youtube-subtitles-debug', 'true');
    console.log('✅ 调试模式已启用，页面将在2秒后刷新...');
    setTimeout(() => {
      location.reload();
    }, 2000);
  }

  // 运行完整测试
  async function runFullTest() {
    console.log('🚀 开始完整测试...');
    console.log('='.repeat(40));

    // 1. 环境检查
    if (!checkEnvironment()) {
      return;
    }

    console.log('-'.repeat(30));

    // 2. 扩展通信测试
    const extensionOk = await testExtension();
    if (!extensionOk) {
      console.log('💡 建议操作:');
      console.log('  1. 检查 chrome://extensions/ 中插件是否启用');
      console.log('  2. 尝试重新加载插件');
      console.log('  3. 查看插件是否有错误信息');
      return;
    }

    console.log('-'.repeat(30));

    // 3. 翻译功能测试
    await testTranslation();

    console.log('-'.repeat(30));

    // 4. 字幕元素检查
    checkSubtitles();

    console.log('='.repeat(40));
    console.log('🏁 测试完成');
  }

  // 导出到全局
  window.ytDebug = {
    checkEnvironment,
    testExtension,
    testTranslation,
    checkSubtitles,
    enableDebugMode,
    runFullTest
  };

  console.log('🔧 调试工具已加载，可用命令:');
  console.log('- ytDebug.runFullTest() - 运行完整测试');
  console.log('- ytDebug.testTranslation() - 测试翻译功能');
  console.log('- ytDebug.enableDebugMode() - 启用调试模式');
  console.log('- ytDebug.checkSubtitles() - 检查字幕元素');

  // 自动运行测试
  console.log('🚀 自动开始测试...');
  runFullTest();

})();

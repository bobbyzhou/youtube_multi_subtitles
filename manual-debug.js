// manual-debug.js - 手动调试脚本
// 直接在控制台中粘贴运行

console.log('🔧 手动调试脚本开始...');

// 检查环境
function checkEnvironment() {
  console.log('📊 环境检查:');
  console.log('- URL:', window.location.href);
  console.log('- 是否YouTube视频页面:', window.location.href.includes('/watch'));
  console.log('- Chrome扩展API:', typeof chrome);
  console.log('- Chrome Runtime:', typeof chrome?.runtime);
}

// 启用调试模式
function enableDebugMode() {
  console.log('🐛 启用调试模式...');
  localStorage.setItem('youtube-subtitles-debug', 'true');
  console.log('✅ 调试模式已启用，页面将刷新...');
  setTimeout(() => location.reload(), 1000);
}

// 测试扩展通信
async function testExtensionCommunication() {
  console.log('📡 测试扩展通信...');

  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('❌ Chrome扩展API不可用');
    return;
  }

  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'GET_SETTINGS'
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    console.log('✅ 扩展通信正常:', response);
    return response;

  } catch (error) {
    console.error('❌ 扩展通信失败:', error);
    return null;
  }
}

// 测试翻译功能
async function testTranslation() {
  console.log('🔄 测试翻译功能...');

  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'TRANSLATE_TEXT',
        text: 'Hello world',
        targetLanguage: 'zh-CN',
        sourceLanguage: 'en'
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (response && response.success) {
      console.log('✅ 翻译成功:', response.translation);
      console.log('📊 来源:', response.fromCache ? '缓存' : '实时翻译');
    } else {
      console.error('❌ 翻译失败:', response?.error);
    }

    return response;

  } catch (error) {
    console.error('❌ 翻译测试失败:', error);
    return null;
  }
}

// 检查字幕元素
function checkSubtitleElements() {
  console.log('🎬 检查字幕元素...');

  const selectors = [
    '.ytp-caption-segment',
    '.captions-text',
    '.ytp-caption-window-container .ytp-caption-segment',
    '[class*="caption"]'
  ];

  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`- ${selector}: ${elements.length} 个元素`);
    if (elements.length > 0) {
      console.log('  内容示例:', elements[0].textContent?.substring(0, 50));
    }
  });
}

// 运行完整诊断
async function runFullDiagnosis() {
  console.log('🚀 开始完整诊断...');
  console.log('='.repeat(50));

  checkEnvironment();
  console.log('-'.repeat(30));

  const settings = await testExtensionCommunication();
  console.log('-'.repeat(30));

  if (settings) {
    await testTranslation();
    console.log('-'.repeat(30));
  }

  checkSubtitleElements();
  console.log('='.repeat(50));
  console.log('🏁 诊断完成');
}

// 导出到全局
window.manualDebug = {
  enableDebugMode,
  testExtensionCommunication,
  testTranslation,
  checkSubtitleElements,
  runFullDiagnosis
};

console.log('🔧 手动调试脚本已加载');
console.log('可用命令:');
console.log('- manualDebug.enableDebugMode() - 启用调试模式');
console.log('- manualDebug.testTranslation() - 测试翻译');
console.log('- manualDebug.runFullDiagnosis() - 完整诊断');

// 自动运行诊断
runFullDiagnosis();

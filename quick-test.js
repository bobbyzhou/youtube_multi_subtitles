// quick-test.js - 快速测试翻译功能
// 在YouTube页面的控制台中运行此脚本

console.log('🧪 开始快速测试翻译功能...');

// 测试翻译功能
async function quickTest() {
  try {
    console.log('📤 发送翻译请求...');
    
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
    
    console.log('📥 收到响应:', response);
    
    if (response && response.success) {
      console.log('✅ 翻译成功:', response.translation);
      console.log('📊 来源:', response.fromCache ? '缓存' : '实时翻译');
    } else {
      console.error('❌ 翻译失败:', response?.error);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 测试设置获取
async function testSettings() {
  try {
    console.log('📤 获取设置...');
    
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
    
    console.log('📥 当前设置:', response);
    
    if (response && response.success) {
      console.log('✅ 设置获取成功');
      console.log('🔑 API Key:', response.settings.apiKey ? '已配置' : '未配置');
      console.log('🌐 目标语言:', response.settings.targetLanguage);
    } else {
      console.error('❌ 设置获取失败:', response?.error);
    }
    
  } catch (error) {
    console.error('❌ 设置测试失败:', error);
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始完整测试...');
  
  await testSettings();
  console.log('---');
  await quickTest();
  
  console.log('🏁 测试完成');
}

// 导出测试函数到全局
window.quickTest = quickTest;
window.testSettings = testSettings;
window.runAllTests = runAllTests;

console.log('🔧 快速测试脚本已加载');
console.log('使用以下命令进行测试:');
console.log('  quickTest() - 测试翻译功能');
console.log('  testSettings() - 测试设置获取');
console.log('  runAllTests() - 运行所有测试');

// 自动运行测试
runAllTests();

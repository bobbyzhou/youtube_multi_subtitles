// test-content.js - 简单的测试脚本
console.log('🧪 测试Content Script已加载!');

// 添加到全局作用域
window.testContentScript = true;
window.testMessage = '测试Content Script正常工作';

// 简单的调试函数
window.simpleDebug = function() {
  console.log('✅ Content Script调试函数正常工作');
  console.log('当前页面:', window.location.href);
  console.log('Chrome API可用:', typeof chrome !== 'undefined');
  console.log('Chrome Runtime可用:', typeof chrome?.runtime !== 'undefined');
  
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({type: 'GET_SETTINGS'}, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ 扩展通信失败:', chrome.runtime.lastError.message);
      } else {
        console.log('✅ 扩展通信成功:', response);
      }
    });
  }
};

console.log('🔧 使用 simpleDebug() 进行测试');

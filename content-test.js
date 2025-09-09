// content-test.js - 简化的测试版本
console.log('🚀 Content Test Script 开始加载...');

try {
  console.log('📍 当前页面:', window.location.href);
  
  // 测试基本的类定义
  class TestBilingualSubtitles {
    constructor() {
      console.log('✅ 测试类构造函数执行成功');
      this.settings = {
        enabled: true,
        targetLanguage: 'zh-CN'
      };
    }
    
    test() {
      console.log('✅ 测试方法执行成功');
      return 'test success';
    }
  }
  
  console.log('🔧 正在初始化测试类...');
  const testInstance = new TestBilingualSubtitles();
  console.log('✅ 测试类初始化完成');
  
  // 添加到全局作用域
  window.TestBilingualSubtitles = TestBilingualSubtitles;
  window.testInstance = testInstance;
  
  console.log('🎉 Content Test Script 加载完成!');
  console.log('可以在控制台中使用: window.testInstance.test()');
  
} catch (error) {
  console.error('❌ Content Test Script 执行错误:', error);
  console.error('错误堆栈:', error.stack);
}

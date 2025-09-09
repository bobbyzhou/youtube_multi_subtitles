// performance-monitor.js - 性能监控和调试工具

console.log('📊 Performance Monitor 开始加载...');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      translationRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageTranslationTime: 0,
      totalTranslationTime: 0,
      errors: 0,
      memoryUsage: {
        cacheSize: 0,
        queueSize: 0
      }
    };

    this.translationTimes = [];
    this.maxSamples = 100; // 保留最近100次翻译的时间记录
  }

  // 记录翻译请求开始
  startTranslation(text) {
    const startTime = performance.now();
    this.metrics.translationRequests++;

    return {
      text,
      startTime,
      finish: (success, fromCache = false) => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (success) {
          if (fromCache) {
            this.metrics.cacheHits++;
          } else {
            this.metrics.cacheMisses++;
            this.recordTranslationTime(duration);
          }
        } else {
          this.metrics.errors++;
        }

        this.updateMemoryUsage();
      }
    };
  }

  // 记录翻译时间
  recordTranslationTime(duration) {
    this.translationTimes.push(duration);

    // 保持样本数量在限制内
    if (this.translationTimes.length > this.maxSamples) {
      this.translationTimes.shift();
    }

    // 更新平均时间
    this.metrics.totalTranslationTime += duration;
    this.metrics.averageTranslationTime =
      this.translationTimes.reduce((a, b) => a + b, 0) / this.translationTimes.length;
  }

  // 更新内存使用情况
  updateMemoryUsage() {
    if (window.bilingualSubtitles) {
      this.metrics.memoryUsage.cacheSize = window.bilingualSubtitles.translationCache.size;
      this.metrics.memoryUsage.queueSize = window.bilingualSubtitles.translationQueue.size;
    }
  }

  // 获取性能报告
  getReport() {
    const cacheHitRate = this.metrics.translationRequests > 0
      ? (this.metrics.cacheHits / this.metrics.translationRequests * 100).toFixed(2)
      : 0;

    const errorRate = this.metrics.translationRequests > 0
      ? (this.metrics.errors / this.metrics.translationRequests * 100).toFixed(2)
      : 0;

    return {
      summary: {
        totalRequests: this.metrics.translationRequests,
        cacheHitRate: `${cacheHitRate}%`,
        errorRate: `${errorRate}%`,
        averageTranslationTime: `${this.metrics.averageTranslationTime.toFixed(2)}ms`
      },
      details: {
        cacheHits: this.metrics.cacheHits,
        cacheMisses: this.metrics.cacheMisses,
        errors: this.metrics.errors,
        memoryUsage: this.metrics.memoryUsage,
        recentTranslationTimes: this.translationTimes.slice(-10) // 最近10次
      }
    };
  }

  // 打印性能报告到控制台
  printReport() {
    const report = this.getReport();

    console.group('🚀 YouTube双语字幕 - 性能报告');
    console.log('📊 总览:', report.summary);
    console.log('📈 详细数据:', report.details);
    console.groupEnd();
  }

  // 重置统计数据
  reset() {
    this.metrics = {
      translationRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageTranslationTime: 0,
      totalTranslationTime: 0,
      errors: 0,
      memoryUsage: {
        cacheSize: 0,
        queueSize: 0
      }
    };

    this.translationTimes = [];
  }

  // 检查性能问题并给出建议
  getOptimizationSuggestions() {
    const report = this.getReport();
    const suggestions = [];

    // 缓存命中率低
    if (parseFloat(report.summary.cacheHitRate) < 30) {
      suggestions.push({
        type: 'cache',
        message: '缓存命中率较低，建议增加缓存时间或启用预翻译功能'
      });
    }

    // 翻译时间过长
    if (this.metrics.averageTranslationTime > 2000) {
      suggestions.push({
        type: 'performance',
        message: '翻译响应时间较慢，建议检查网络连接或使用官方API'
      });
    }

    // 错误率高
    if (parseFloat(report.summary.errorRate) > 10) {
      suggestions.push({
        type: 'reliability',
        message: '翻译错误率较高，建议检查API配置或网络状况'
      });
    }

    // 内存使用过多
    if (this.metrics.memoryUsage.cacheSize > 200) {
      suggestions.push({
        type: 'memory',
        message: '内存缓存过大，建议清理缓存或减少缓存时间'
      });
    }

    return suggestions;
  }
}

// 创建全局性能监控实例
window.performanceMonitor = new PerformanceMonitor();

// 添加控制台命令
window.showPerformanceReport = () => window.performanceMonitor.printReport();
window.getOptimizationSuggestions = () => {
  const suggestions = window.performanceMonitor.getOptimizationSuggestions();
  if (suggestions.length > 0) {
    console.group('💡 优化建议');
    suggestions.forEach(suggestion => {
      console.log(`${suggestion.type}: ${suggestion.message}`);
    });
    console.groupEnd();
  } else {
    console.log('✅ 性能表现良好，暂无优化建议');
  }
};

// 定期打印性能报告（开发模式）
if (localStorage.getItem('youtube-subtitles-debug') === 'true') {
  setInterval(() => {
    window.performanceMonitor.printReport();
  }, 60000); // 每分钟打印一次
}

console.log('🔧 性能监控已启用。使用 showPerformanceReport() 查看报告，使用 getOptimizationSuggestions() 获取优化建议');
console.log('✅ Performance Monitor 加载完成!');

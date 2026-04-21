#!/usr/bin/env ts-node

/**
 * 性能测试脚本
 * 运行各种性能测试并生成报告
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface PerformanceTestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  metrics: Record<string, number>;
  timestamp: string;
}

interface PerformanceReport {
  timestamp: string;
  testSuite: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  results: PerformanceTestResult[];
  baseline?: {
    timestamp: string;
    metrics: Record<string, number>;
  };
  comparison?: {
    improvements: string[];
    regressions: string[];
    neutral: string[];
  };
}

class PerformanceTestRunner {
  private resultsDir: string;
  private baselineFile: string;

  constructor() {
    this.resultsDir = path.join(process.cwd(), 'reports', 'performance');
    this.baselineFile = path.join(this.resultsDir, 'baseline.json');

    // 确保结果目录存在
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  /**
   * 运行所有性能测试
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 开始运行性能测试套件...\n');

    const testSuites = [
      { name: '页面加载性能', file: 'page-load-performance.test.ts' },
      { name: '组件渲染性能', file: 'component-rendering-performance.test.ts' },
      { name: 'API性能测试', file: 'api-performance.test.ts' },
      { name: '内存泄漏检测', file: 'memory-leak-detection.test.ts' },
    ];

    const allResults: PerformanceTestResult[] = [];

    for (const suite of testSuites) {
      console.log(`\n📊 运行测试套件: ${suite.name}`);
      console.log('='.repeat(60));

      try {
        const result = await this.runTestSuite(suite);
        allResults.push(...result);
      } catch (error) {
        console.error(`❌ 测试套件 "${suite.name}" 失败:`, error);
      }
    }

    // 生成报告
    await this.generateReport(allResults);

    // 与基准对比
    await this.compareWithBaseline(allResults);

    console.log('\n✅ 性能测试完成!');
    console.log(`📁 报告保存在: ${this.resultsDir}`);
  }

  /**
   * 运行单个测试套件
   */
  private async runTestSuite(suite: { name: string; file: string }): Promise<PerformanceTestResult[]> {
    const startTime = Date.now();

    try {
      // 运行 Vitest 测试
      const testPath = path.join('tests', 'performance', suite.file);

      execSync(`npx vitest run ${testPath} --reporter=verbose`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      const duration = Date.now() - startTime;

      // 返回模拟结果（实际应该从测试输出解析）
      return [{
        name: suite.name,
        status: 'pass',
        duration,
        metrics: {},
        timestamp: new Date().toISOString(),
      }];
    } catch (error) {
      const duration = Date.now() - startTime;
      return [{
        name: suite.name,
        status: 'fail',
        duration,
        metrics: {},
        timestamp: new Date().toISOString(),
      }];
    }
  }

  /**
   * 生成性能报告
   */
  private async generateReport(results: PerformanceTestResult[]): Promise<void> {
    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      testSuite: '全面性能测试',
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'pass').length,
        failed: results.filter(r => r.status === 'fail').length,
        skipped: results.filter(r => r.status === 'skip').length,
        duration: results.reduce((sum, r) => sum + r.duration, 0),
      },
      results,
    };

    // 保存JSON报告
    const jsonReportPath = path.join(this.resultsDir, `report-${Date.now()}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));

    // 生成HTML报告
    const htmlReportPath = path.join(this.resultsDir, `report-${Date.now()}.html`);
    const htmlReport = this.generateHTMLReport(report);
    fs.writeFileSync(htmlReportPath, htmlReport);

    // 生成Markdown报告
    const mdReportPath = path.join(this.resultsDir, `report-${Date.now()}.md`);
    const mdReport = this.generateMarkdownReport(report);
    fs.writeFileSync(mdReportPath, mdReport);

    console.log('\n📈 性能报告生成完毕:');
    console.log(`  - JSON: ${jsonReportPath}`);
    console.log(`  - HTML: ${htmlReportPath}`);
    console.log(`  - Markdown: ${mdReportPath}`);

    // 打印摘要
    console.log('\n📊 测试摘要:');
    console.log(`  总计: ${report.summary.total}`);
    console.log(`  通过: ${report.summary.passed} ✅`);
    console.log(`  失败: ${report.summary.failed} ❌`);
    console.log(`  跳过: ${report.summary.skipped} ⏭️`);
    console.log(`  总耗时: ${report.summary.duration}ms`);
  }

  /**
   * 生成HTML报告
   */
  private generateHTMLReport(report: PerformanceReport): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>性能测试报告 - ${report.timestamp}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .summary-card {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #4CAF50;
        }
        .summary-card.passed { border-left-color: #4CAF50; }
        .summary-card.failed { border-left-color: #f44336; }
        .summary-card.skipped { border-left-color: #ff9800; }

        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 14px;
        }
        .summary-card .value {
            font-size: 32px;
            font-weight: bold;
            color: #333;
        }
        .results {
            margin-top: 30px;
        }
        .result-item {
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 10px;
        }
        .result-item.pass { border-left: 4px solid #4CAF50; }
        .result-item.fail { border-left: 4px solid #f44336; }
        .result-item.skip { border-left: 4px solid #ff9800; }

        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .result-name {
            font-weight: bold;
            font-size: 16px;
        }
        .result-status {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        .status-pass { background: #4CAF50; color: white; }
        .status-fail { background: #f44336; color: white; }
        .status-skip { background: #ff9800; color: white; }

        .result-metrics {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e0e0e0;
        }
        .metric {
            display: inline-block;
            margin-right: 20px;
            color: #666;
        }
        .timestamp {
            color: #999;
            font-size: 12px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 性能测试报告</h1>
        <p class="timestamp">${new Date(report.timestamp).toLocaleString('zh-CN')}</p>

        <div class="summary">
            <div class="summary-card">
                <h3>总测试数</h3>
                <div class="value">${report.summary.total}</div>
            </div>
            <div class="summary-card passed">
                <h3>通过</h3>
                <div class="value">${report.summary.passed}</div>
            </div>
            <div class="summary-card failed">
                <h3>失败</h3>
                <div class="value">${report.summary.failed}</div>
            </div>
            <div class="summary-card skipped">
                <h3>跳过</h3>
                <div class="value">${report.summary.skipped}</div>
            </div>
            <div class="summary-card">
                <h3>总耗时</h3>
                <div class="value">${report.summary.duration}ms</div>
            </div>
        </div>

        <div class="results">
            <h2>📊 详细结果</h2>
            ${report.results.map(result => `
                <div class="result-item ${result.status}">
                    <div class="result-header">
                        <span class="result-name">${result.name}</span>
                        <span class="result-status status-${result.status}">
                            ${result.status.toUpperCase()}
                        </span>
                    </div>
                    <div class="result-metrics">
                        <span class="metric">⏱️ 耗时: ${result.duration}ms</span>
                        ${Object.entries(result.metrics).map(([key, value]) => `
                            <span class="metric">📈 ${key}: ${value}</span>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        ${report.comparison ? `
            <div class="results">
                <h2>📈 与基准对比</h2>
                ${report.comparison.improvements.length > 0 ? `
                    <h3>✅ 性能提升</h3>
                    <ul>
                        ${report.comparison.improvements.map(imp => `<li>${imp}</li>`).join('')}
                    </ul>
                ` : ''}

                ${report.comparison.regressions.length > 0 ? `
                    <h3>⚠️ 性能回归</h3>
                    <ul>
                        ${report.comparison.regressions.map(reg => `<li>${reg}</li>`).join('')}
                    </ul>
                ` : ''}

                ${report.comparison.neutral.length > 0 ? `
                    <h3>➖ 无显著变化</h3>
                    <ul>
                        ${report.comparison.neutral.map(neu => `<li>${neu}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        ` : ''}
    </div>
</body>
</html>
    `;
  }

  /**
   * 生成Markdown报告
   */
  private generateMarkdownReport(report: PerformanceReport): string {
    return `
# 性能测试报告

**生成时间**: ${new Date(report.timestamp).toLocaleString('zh-CN')}

## 📊 测试摘要

| 指标 | 数值 |
|------|------|
| 总测试数 | ${report.summary.total} |
| 通过 | ${report.summary.passed} ✅ |
| 失败 | ${report.summary.failed} ❌ |
| 跳过 | ${report.summary.skipped} ⏭️ |
| 总耗时 | ${report.summary.duration}ms |

## 📈 详细结果

${report.results.map(result => `
### ${result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️'} ${result.name}

- **状态**: ${result.status.toUpperCase()}
- **耗时**: ${result.duration}ms
- **时间戳**: ${new Date(result.timestamp).toLocaleString('zh-CN')}

${Object.keys(result.metrics).length > 0 ? `
**指标**:
${Object.entries(result.metrics).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
` : ''}
`).join('\n---\n')}

${report.comparison ? `
## 🔍 与基准对比

### ✅ 性能提升
${report.comparison.improvements.length > 0 ?
  report.comparison.improvements.map(imp => `- ${imp}`).join('\n') :
  '无'}

### ⚠️ 性能回归
${report.comparison.regressions.length > 0 ?
  report.comparison.regressions.map(reg => `- ${reg}`).join('\n') :
  '无'}

### ➖ 无显著变化
${report.comparison.neutral.length > 0 ?
  report.comparison.neutral.map(neu => `- ${neu}`).join('\n') :
  '无'}
` : ''}

---

*此报告由性能测试脚本自动生成*
    `;
  }

  /**
   * 与基准对比
   */
  private async compareWithBaseline(results: PerformanceTestResult[]): Promise<void> {
    if (!fs.existsSync(this.baselineFile)) {
      console.log('\n⚠️  未找到基准数据，将当前结果设为新基准');
      this.saveBaseline(results);
      return;
    }

    console.log('\n📊 与基准对比中...');

    const baselineData = JSON.parse(fs.readFileSync(this.baselineFile, 'utf-8'));
    const comparison = this.compareResults(baselineData.results, results);

    console.log('\n📈 对比结果:');
    console.log(`✅ 性能提升: ${comparison.improvements.length}项`);
    console.log(`⚠️ 性能回归: ${comparison.regressions.length}项`);
    console.log(`➖ 无显著变化: ${comparison.neutral.length}项`);

    if (comparison.regressions.length > 0) {
      console.log('\n⚠️ 发现性能回归:');
      comparison.regressions.forEach(reg => console.log(`  - ${reg}`));
    }

    if (comparison.improvements.length > 0) {
      console.log('\n✅ 性能提升:');
      comparison.improvements.forEach(imp => console.log(`  - ${imp}`));
    }

    // 询问是否更新基准
    const hasRegressions = comparison.regressions.length > 0;
    if (!hasRegressions) {
      console.log('\n💡 提示: 当前性能优于或等于基准，考虑更新基准数据');
    }
  }

  /**
   * 对比结果
   */
  private compareResults(
    baseline: PerformanceTestResult[],
    current: PerformanceTestResult[]
  ): { improvements: string[]; regressions: string[]; neutral: string[] } {
    const improvements: string[] = [];
    const regressions: string[] = [];
    const neutral: string[] = [];

    const threshold = 0.1; // 10%阈值

    for (const currentResult of current) {
      const baselineResult = baseline.find(b => b.name === currentResult.name);

      if (!baselineResult) {
        neutral.push(`${currentResult.name}: 新增测试`);
        continue;
      }

      const durationDiff = currentResult.duration - baselineResult.duration;
      const percentageChange = (durationDiff / baselineResult.duration) * 100;

      if (percentageChange > threshold * 100) {
        regressions.push(
          `${currentResult.name}: +${percentageChange.toFixed(1)}% ` +
          `(${baselineResult.duration}ms → ${currentResult.duration}ms)`
        );
      } else if (percentageChange < -threshold * 100) {
        improvements.push(
          `${currentResult.name}: ${percentageChange.toFixed(1)}% ` +
          `(${baselineResult.duration}ms → ${currentResult.duration}ms)`
        );
      } else {
        neutral.push(
          `${currentResult.name}: ±${percentageChange.toFixed(1)}% ` +
          `(${baselineResult.duration}ms → ${currentResult.duration}ms)`
        );
      }
    }

    return { improvements, regressions, neutral };
  }

  /**
   * 保存基准
   */
  private saveBaseline(results: PerformanceTestResult[]): void {
    const baseline = {
      timestamp: new Date().toISOString(),
      results,
    };

    fs.writeFileSync(this.baselineFile, JSON.stringify(baseline, null, 2));
    console.log(`✅ 基准数据已保存到: ${this.baselineFile}`);
  }

  /**
   * 设置基准
   */
  async setBaseline(): Promise<void> {
    console.log('🎯 运行测试以设置基准...\n');

    const testSuites = [
      { name: '页面加载性能', file: 'page-load-performance.test.ts' },
      { name: '组件渲染性能', file: 'component-rendering-performance.test.ts' },
      { name: 'API性能测试', file: 'api-performance.test.ts' },
      { name: '内存泄漏检测', file: 'memory-leak-detection.test.ts' },
    ];

    const allResults: PerformanceTestResult[] = [];

    for (const suite of testSuites) {
      console.log(`运行测试套件: ${suite.name}`);

      try {
        const result = await this.runTestSuite(suite);
        allResults.push(...result);
      } catch (error) {
        console.error(`测试套件 "${suite.name}" 失败:`, error);
      }
    }

    this.saveBaseline(allResults);
    console.log('\n✅ 基准设置完成!');
  }
}

// CLI接口
async function main() {
  const args = process.argv.slice(2);
  const runner = new PerformanceTestRunner();

  if (args.includes('--set-baseline')) {
    await runner.setBaseline();
  } else if (args.includes('--help')) {
    console.log(`
性能测试脚本

用法:
  npm run test:performance                    # 运行所有性能测试
  npm run test:performance -- --set-baseline  # 设置性能基准
  npm run test:performance -- --help          # 显示帮助信息

选项:
  --set-baseline    将当前测试结果设为新的性能基准
  --help           显示此帮助信息
    `);
  } else {
    await runner.runAllTests();
  }
}

// 运行脚本
main().catch(error => {
  console.error('❌ 性能测试脚本执行失败:', error);
  process.exit(1);
});

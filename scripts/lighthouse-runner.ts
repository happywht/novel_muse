#!/usr/bin/env ts-node

/**
 * Lighthouse性能测试脚本
 * 使用Lighthouse进行自动化性能审计
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface LighthouseResult {
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  metrics: {
    fcp: number;
    lcp: number;
    cls: number;
    fid: number;
    ttfb: number;
    speedIndex: number;
    interactive: number;
  };
  timestamp: string;
}

class LighthouseRunner {
  private resultsDir: string;
  private baseUrl: string;
  private routes: string[];

  constructor(baseUrl: string = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.resultsDir = path.join(process.cwd(), 'reports', 'lighthouse');
    this.routes = [
      '/',
      '/character',
      '/plot',
      '/world',
      '/drafting',
      '/echo',
    ];

    // 确保结果目录存在
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  /**
   * 运行Lighthouse审计
   */
  async runAudit(): Promise<LighthouseResult[]> {
    console.log('🔍 开始Lighthouse性能审计...\n');

    // 检查服务器是否运行
    if (!await this.isServerRunning()) {
      console.error('❌ 开发服务器未运行，请先启动: npm run dev');
      throw new Error('Server not running');
    }

    const results: LighthouseResult[] = [];

    for (const route of this.routes) {
      const url = `${this.baseUrl}${route}`;
      console.log(`\n📊 审计路由: ${url}`);

      try {
        const result = await this.auditUrl(url);
        results.push(result);

        console.log(`✅ 完成 - 性能评分: ${result.performance}`);
      } catch (error) {
        console.error(`❌ 审计失败 ${url}:`, error);
      }
    }

    // 生成报告
    await this.generateReport(results);

    return results;
  }

  /**
   * 审计单个URL
   */
  private async auditUrl(url: string): Promise<LighthouseResult> {
    const outputPath = path.join(
      this.resultsDir,
      `${this.sanitizeFileName(url)}-${Date.now()}.json`
    );

    // 运行Lighthouse
    const command = `npx lighthouse "${url}" --output=json --output-path="${outputPath}" --quiet --chrome-flags="--headless"`;

    try {
      execSync(command, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      // 读取结果
      const report = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

      return {
        url,
        performance: Math.round(report.categories.performance.score * 100),
        accessibility: Math.round(report.categories.accessibility.score * 100),
        bestPractices: Math.round(report.categories['best-practices'].score * 100),
        seo: Math.round(report.categories.seo.score * 100),
        metrics: this.extractMetrics(report),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Lighthouse audit failed for ${url}: ${error}`);
    }
  }

  /**
   * 提取性能指标
   */
  private extractMetrics(report: any): LighthouseResult['metrics'] {
    const audits = report.audits;

    return {
      fcp: audits['first-contentful-paint']?.numericValue || 0,
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      fid: audits['max-potential-fid']?.numericValue || 0,
      ttfb: audits['server-response-time']?.numericValue || 0,
      speedIndex: audits['speed-index']?.numericValue || 0,
      interactive: audits['interactive']?.numericValue || 0,
    };
  }

  /**
   * 生成报告
   */
  private async generateReport(results: LighthouseResult[]): Promise<void> {
    // 保存JSON报告
    const jsonPath = path.join(this.resultsDir, `summary-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

    // 生成HTML报告
    const htmlPath = path.join(this.resultsDir, `summary-${Date.now()}.html`);
    const htmlReport = this.generateHTMLReport(results);
    fs.writeFileSync(htmlPath, htmlReport);

    // 生成Markdown报告
    const mdPath = path.join(this.resultsDir, `summary-${Date.now()}.md`);
    const mdReport = this.generateMarkdownReport(results);
    fs.writeFileSync(mdPath, mdReport);

    console.log('\n📈 Lighthouse报告生成完毕:');
    console.log(`  - JSON: ${jsonPath}`);
    console.log(`  - HTML: ${htmlPath}`);
    console.log(`  - Markdown: ${mdPath}`);

    // 打印摘要
    this.printSummary(results);
  }

  /**
   * 生成HTML报告
   */
  private generateHTMLReport(results: LighthouseResult[]): string {
    const averageScores = this.calculateAverageScores(results);

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lighthouse性能审计报告</title>
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
            border-bottom: 3px solid #0F9D58;
            padding-bottom: 10px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .score-card {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 6px;
            text-align: center;
        }
        .score-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px;
            font-size: 24px;
            font-weight: bold;
            color: white;
        }
        .score-good { background: #0F9D58; }
        .score-medium { background: #F4B400; }
        .score-poor { background: #DB4437; }

        .route-result {
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .route-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .route-url {
            font-size: 18px;
            font-weight: bold;
            color: #333;
        }
        .route-scores {
            display: flex;
            gap: 10px;
        }
        .mini-score {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            color: white;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .metric {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
        }
        .metric-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 16px;
            font-weight: bold;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Lighthouse性能审计报告</h1>
        <p>${new Date().toLocaleString('zh-CN')}</p>

        <div class="summary">
            <div class="score-card">
                <div class="score-circle ${this.getScoreClass(averageScores.performance)}">
                    ${averageScores.performance}
                </div>
                <div>性能</div>
            </div>
            <div class="score-card">
                <div class="score-circle ${this.getScoreClass(averageScores.accessibility)}">
                    ${averageScores.accessibility}
                </div>
                <div>可访问性</div>
            </div>
            <div class="score-card">
                <div class="score-circle ${this.getScoreClass(averageScores.bestPractices)}">
                    ${averageScores.bestPractices}
                </div>
                <div>最佳实践</div>
            </div>
            <div class="score-card">
                <div class="score-circle ${this.getScoreClass(averageScores.seo)}">
                    ${averageScores.seo}
                </div>
                <div>SEO</div>
            </div>
        </div>

        <h2>📊 路由详细结果</h2>
        ${results.map(result => `
            <div class="route-result">
                <div class="route-header">
                    <div class="route-url">${result.url}</div>
                    <div class="route-scores">
                        <span class="mini-score ${this.getScoreClass(result.performance)}">P: ${result.performance}</span>
                        <span class="mini-score ${this.getScoreClass(result.accessibility)}">A: ${result.accessibility}</span>
                        <span class="mini-score ${this.getScoreClass(result.bestPractices)}">BP: ${result.bestPractices}</span>
                        <span class="mini-score ${this.getScoreClass(result.seo)}">S: ${result.seo}</span>
                    </div>
                </div>
                <div class="metrics-grid">
                    <div class="metric">
                        <div class="metric-label">FCP (First Contentful Paint)</div>
                        <div class="metric-value">${result.metrics.fcp.toFixed(0)}ms</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">LCP (Largest Contentful Paint)</div>
                        <div class="metric-value">${result.metrics.lcp.toFixed(0)}ms</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">CLS (Cumulative Layout Shift)</div>
                        <div class="metric-value">${result.metrics.cls.toFixed(3)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">FID (First Input Delay)</div>
                        <div class="metric-value">${result.metrics.fid.toFixed(0)}ms</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">TTFB (Time to First Byte)</div>
                        <div class="metric-value">${result.metrics.ttfb.toFixed(0)}ms</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Speed Index</div>
                        <div class="metric-value">${result.metrics.speedIndex.toFixed(0)}ms</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Interactive</div>
                        <div class="metric-value">${result.metrics.interactive.toFixed(0)}ms</div>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;
  }

  /**
   * 生成Markdown报告
   */
  private generateMarkdownReport(results: LighthouseResult[]): string {
    const averageScores = this.calculateAverageScores(results);

    return `
# Lighthouse性能审计报告

**生成时间**: ${new Date().toLocaleString('zh-CN')}

## 📊 平均分数

| 类别 | 分数 | 评级 |
|------|------|------|
| 性能 | ${averageScores.performance} | ${this.getScoreLabel(averageScores.performance)} |
| 可访问性 | ${averageScores.accessibility} | ${this.getScoreLabel(averageScores.accessibility)} |
| 最佳实践 | ${averageScores.bestPractices} | ${this.getScoreLabel(averageScores.bestPractices)} |
| SEO | ${averageScores.seo} | ${this.getScoreLabel(averageScores.seo)} |

## 📈 详细结果

${results.map(result => `
### ${result.url}

**分数**: ${result.performance}/100 (性能)

| 指标 | 数值 |
|------|------|
| FCP (First Contentful Paint) | ${result.metrics.fcp.toFixed(0)}ms |
| LCP (Largest Contentful Paint) | ${result.metrics.lcp.toFixed(0)}ms |
| CLS (Cumulative Layout Shift) | ${result.metrics.cls.toFixed(3)} |
| FID (First Input Delay) | ${result.metrics.fid.toFixed(0)}ms |
| TTFB (Time to First Byte) | ${result.metrics.ttfb.toFixed(0)}ms |
| Speed Index | ${result.metrics.speedIndex.toFixed(0)}ms |
| Interactive | ${result.metrics.interactive.toFixed(0)}ms |

**其他分类**:
- 可访问性: ${result.accessibility}/100
- 最佳实践: ${result.bestPractices}/100
- SEO: ${result.seo}/100

---

`).join('')}

---

*此报告由Lighthouse自动化脚本生成*
    `;
  }

  /**
   * 计算平均分数
   */
  private calculateAverageScores(results: LighthouseResult[]): {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  } {
    return {
      performance: Math.round(
        results.reduce((sum, r) => sum + r.performance, 0) / results.length
      ),
      accessibility: Math.round(
        results.reduce((sum, r) => sum + r.accessibility, 0) / results.length
      ),
      bestPractices: Math.round(
        results.reduce((sum, r) => sum + r.bestPractices, 0) / results.length
      ),
      seo: Math.round(
        results.reduce((sum, r) => sum + r.seo, 0) / results.length
      ),
    };
  }

  /**
   * 获取分数样式类
   */
  private getScoreClass(score: number): string {
    if (score >= 90) return 'score-good';
    if (score >= 50) return 'score-medium';
    return 'score-poor';
  }

  /**
   * 获取分数标签
   */
  private getScoreLabel(score: number): string {
    if (score >= 90) return '优秀 ✅';
    if (score >= 50) return '需改进 ⚠️';
    return '差 ❌';
  }

  /**
   * 打印摘要
   */
  private printSummary(results: LighthouseResult[]): void {
    const averageScores = this.calculateAverageScores(results);

    console.log('\n📊 审计摘要:');
    console.log(`  性能: ${averageScores.performance}/100 ${this.getScoreLabel(averageScores.performance)}`);
    console.log(`  可访问性: ${averageScores.accessibility}/100 ${this.getScoreLabel(averageScores.accessibility)}`);
    console.log(`  最佳实践: ${averageScores.bestPractices}/100 ${this.getScoreLabel(averageScores.bestPractices)}`);
    console.log(`  SEO: ${averageScores.seo}/100 ${this.getScoreLabel(averageScores.seo)}`);

    console.log('\n📈 路由性能详情:');
    results.forEach(result => {
      console.log(`  ${result.url}: ${result.performance}/100`);
    });
  }

  /**
   * 检查服务器是否运行
   */
  private async isServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 清理文件名
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .replace(/_+/g, '_')
      .substring(0, 50);
  }
}

// CLI接口
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args.find(arg => arg.startsWith('--url='))?.split('=')[1] || 'http://localhost:5173';

  const runner = new LighthouseRunner(baseUrl);

  try {
    await runner.runAudit();
    console.log('\n✅ Lighthouse审计完成!');
  } catch (error) {
    console.error('❌ Lighthouse审计失败:', error);
    process.exit(1);
  }
}

// 运行脚本
main().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

/**
 * E2E测试辅助工具
 */

import { Page, expect } from '@playwright/test';

/**
 * 项目管理测试辅助类
 */
export class ProjectHelpers {
  constructor(private page: Page) {}

  /**
   * 导航到大厅
   */
  async goToLobby() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 创建新项目
   */
  async createProject(projectData: {
    title: string;
    genre: string;
    premise?: string;
  }) {
    // 点击创建项目按钮
    await this.page.click('[data-testid="create-project-button"]');

    // 填写项目信息
    await this.page.fill('[data-testid="project-title-input"]', projectData.title);
    await this.page.fill('[data-testid="project-genre-input"]', projectData.genre);

    if (projectData.premise) {
      await this.page.fill('[data-testid="project-premise-input"]', projectData.premise);
    }

    // 提交表单
    await this.page.click('[data-testid="submit-project-button"]');

    // 等待项目创建成功
    await this.page.waitForSelector('[data-testid="project-created-success"]', { timeout: 5000 });
  }

  /**
   * 切换项目
   */
  async switchProject(projectId: string) {
    await this.page.click(`[data-testid="project-${projectId}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string) {
    // 打开项目菜单
    await this.page.click(`[data-testid="project-${projectId}-menu"]`);

    // 点击删除按钮
    await this.page.click('[data-testid="delete-project-button"]');

    // 确认删除
    await this.page.click('[data-testid="confirm-delete-button"]');

    // 等待删除成功
    await this.page.waitForSelector(`[data-testid="project-${projectId}"]`, { state: 'hidden' });
  }

  /**
   * 验证项目列表包含指定项目
   */
  async expectProjectInList(projectTitle: string) {
    await expect(this.page.locator(`[data-testid="project-title-${projectTitle}"]`)).toBeVisible();
  }

  /**
   * 验证项目不在列表中
   */
  async expectProjectNotInList(projectTitle: string) {
    await expect(this.page.locator(`[data-testid="project-title-${projectTitle}"]`)).not.toBeVisible();
  }
}

/**
 * 创世纪流程测试辅助类
 */
export class ForgeHelpers {
  constructor(private page: Page) {}

  /**
   * 进入创世纪模块
   */
  async goToForge() {
    await this.page.click('[data-testid="nav-forge"]');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 启动创世纪流程
   */
  async startGenesis() {
    await this.page.click('[data-testid="start-genesis-button"]');
    await this.page.waitForSelector('[data-testid="genesis-progress"]', { timeout: 10000 });
  }

  /**
   * 等待创世纪完成
   */
  async waitForGenesisComplete(timeout = 60000) {
    await this.page.waitForSelector('[data-testid="genesis-complete"]', { timeout });
  }

  /**
   * 验证世界元素已生成
   */
  async expectWorldElementsGenerated() {
    await expect(this.page.locator('[data-testid="world-characters-list"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="world-settings-list"]')).toBeVisible();
  }
}

/**
 * Echo系统测试辅助类
 */
export class EchoHelpers {
  constructor(private page: Page) {}

  /**
   * 进入Echo模块
   */
  async goToEcho() {
    await this.page.click('[data-testid="nav-echo"]');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 创建新Echo
   */
  async createEcho(echoData: {
    title: string;
    content: string;
    type?: string;
  }) {
    await this.page.click('[data-testid="create-echo-button"]');

    await this.page.fill('[data-testid="echo-title-input"]', echoData.title);
    await this.page.fill('[data-testid="echo-content-input"]', echoData.content);

    if (echoData.type) {
      await this.page.selectOption('[data-testid="echo-type-select"]', echoData.type);
    }

    await this.page.click('[data-testid="save-echo-button"]');
    await this.page.waitForSelector('[data-testid="echo-saved-success"]', { timeout: 5000 });
  }

  /**
   * 验证Echo列表包含指定Echo
   */
  async expectEchoInList(echoTitle: string) {
    await expect(this.page.locator(`[data-testid="echo-${echoTitle}"]`)).toBeVisible();
  }

  /**
   * 验证Echo不在列表中
   */
  async expectEchoNotInList(echoTitle: string) {
    await expect(this.page.locator(`[data-testid="echo-${echoTitle}"]`)).not.toBeVisible();
  }
}

/**
 * 数据同步测试辅助类
 */
export class SyncHelpers {
  constructor(private page: Page) {}

  /**
   * 等待自动保存完成
   */
  async waitForAutoSave(timeout = 10000) {
    await this.page.waitForSelector('[data-testid="auto-save-indicator"]', {
      state: 'hidden',
      timeout,
    });
  }

  /**
   * 触发手动保存
   */
  async triggerManualSave() {
    await this.page.click('[data-testid="manual-save-button"]');
    await this.page.waitForSelector('[data-testid="save-success-indicator"]', { timeout: 5000 });
  }

  /**
   * 验证数据已同步到后端（通过检查API响应）
   */
  async expectDataSynced() {
    const response = await this.page.waitForResponse(
      response => response.url().includes('/api/projects') && response.status() === 200
    );
    expect(response.ok()).toBeTruthy();
  }

  /**
   * 模拟网络离线
   */
  async goOffline() {
    await this.page.context().setOffline(true);
  }

  /**
   * 恢复网络在线
   */
  async goOnline() {
    await this.page.context().setOffline(false);
  }
}

/**
 * 性能测试辅助类
 */
export class PerformanceHelpers {
  constructor(private page: Page) {}

  /**
   * 测量页面加载时间
   */
  async measurePageLoad(): Promise<number> {
    const startTime = Date.now();
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  /**
   * 测量组件渲染时间
   */
  async measureComponentRender(selector: string): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForSelector(selector, { state: 'attached' });
    return Date.now() - startTime;
  }

  /**
   * 获取Core Web Vitals
   */
  async getCoreWebVitals() {
    const metrics = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            resolve(entries);
          });
          observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] });
        } else {
          resolve([]);
        }
      });
    });
    return metrics;
  }
}

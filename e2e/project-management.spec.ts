/**
 * 项目管理流程 E2E 测试
 */

import { test, expect } from '@playwright/test';
import { ProjectHelpers } from './helpers';

test.describe('项目管理流程', () => {
  let projectHelpers: ProjectHelpers;

  test.beforeEach(async ({ page }) => {
    projectHelpers = new ProjectHelpers(page);
    await projectHelpers.goToLobby();
  });

  test('应该能够创建新项目', async ({ page }) => {
    const projectData = {
      title: 'E2E测试项目',
      genre: '玄幻',
      premise: '这是一个端到端测试项目',
    };

    await projectHelpers.createProject(projectData);

    // 验证项目已创建并显示在列表中
    await projectHelpers.expectProjectInList(projectData.title);

    // 验证项目详情页已打开
    await expect(page.locator('[data-testid="project-detail-page"]')).toBeVisible();
  });

  test('应该能够切换项目', async ({ page }) => {
    // 创建第一个项目
    await projectHelpers.createProject({
      title: '项目A',
      genre: '玄幻',
    });

    // 返回大厅
    await projectHelpers.goToLobby();

    // 创建第二个项目
    await projectHelpers.createProject({
      title: '项目B',
      genre: '仙侠',
    });

    // 切换回项目A
    await projectHelpers.switchProject('项目A');

    // 验证当前项目是项目A
    await expect(page.locator('[data-testid="current-project-title"]')).toContainText('项目A');
  });

  test('应该能够删除项目', async ({ page }) => {
    // 创建项目
    await projectHelpers.createProject({
      title: '待删除项目',
      genre: '都市',
    });

    // 返回大厅
    await projectHelpers.goToLobby();

    // 删除项目
    await projectHelpers.deleteProject('待删除项目');

    // 验证项目已从列表中移除
    await projectHelpers.expectProjectNotInList('待删除项目');
  });

  test('应该能够编辑项目信息', async ({ page }) => {
    // 创建项目
    await projectHelpers.createProject({
      title: '原始标题',
      genre: '科幻',
    });

    // 点击编辑按钮
    await page.click('[data-testid="edit-project-button"]');

    // 修改标题
    await page.fill('[data-testid="project-title-input"]', '新标题');

    // 保存修改
    await page.click('[data-testid="save-project-button"]');

    // 验证修改成功
    await expect(page.locator('[data-testid="current-project-title"]')).toContainText('新标题');
  });

  test('应该验证必填字段', async ({ page }) => {
    // 尝试创建空标题的项目
    await page.click('[data-testid="create-project-button"]');

    // 不填写标题，直接提交
    await page.click('[data-testid="submit-project-button"]');

    // 验证显示错误提示
    await expect(page.locator('[data-testid="title-required-error"]')).toBeVisible();
  });

  test('应该支持项目搜索', async ({ page }) => {
    // 创建多个项目
    await projectHelpers.createProject({ title: '项目Alpha', genre: '玄幻' });
    await projectHelpers.goToLobby();

    await projectHelpers.createProject({ title: '项目Beta', genre: '仙侠' });
    await projectHelpers.goToLobby();

    await projectHelpers.createProject({ title: '项目Gamma', genre: '都市' });
    await projectHelpers.goToLobby();

    // 搜索"Alpha"
    await page.fill('[data-testid="project-search-input"]', 'Alpha');

    // 验证只显示匹配的项目
    await projectHelpers.expectProjectInList('项目Alpha');
    await projectHelpers.expectProjectNotInList('项目Beta');
    await projectHelpers.expectProjectNotInList('项目Gamma');
  });
});

test.describe('项目数据持久化', () => {
  test('应该自动保存项目更改', async ({ page }) => {
    const projectHelpers = new ProjectHelpers(page);

    // 创建项目
    await projectHelpers.createProject({
      title: '自动保存测试',
      genre: '玄幻',
    });

    // 修改项目内容
    await page.fill('[data-testid="project-premise-input"]', '新的前提内容');

    // 等待自动保存
    await page.waitForSelector('[data-testid="auto-save-indicator"]', { state: 'hidden' });

    // 刷新页面
    await page.reload();

    // 验证内容已保存
    await expect(page.locator('[data-testid="project-premise-input"]')).toHaveValue('新的前提内容');
  });

  test('应该在离线模式下保存数据', async ({ page }) => {
    const projectHelpers = new ProjectHelpers(page);

    // 创建项目
    await projectHelpers.createProject({
      title: '离线测试',
      genre: '玄幻',
    });

    // 模拟离线
    await page.context().setOffline(true);

    // 修改内容
    await page.fill('[data-testid="project-premise-input"]', '离线修改的内容');

    // 恢复在线
    await page.context().setOffline(false);

    // 验证数据同步
    await page.waitForSelector('[data-testid="sync-success-indicator"]');
    await expect(page.locator('[data-testid="project-premise-input"]')).toHaveValue('离线修改的内容');
  });
});

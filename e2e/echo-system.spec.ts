/**
 * Echo系统 E2E 测试
 */

import { test, expect } from '@playwright/test';
import { EchoHelpers, ProjectHelpers } from './helpers';

test.describe('Echo系统', () => {
  let echoHelpers: EchoHelpers;
  let projectHelpers: ProjectHelpers;

  test.beforeEach(async ({ page }) => {
    echoHelpers = new EchoHelpers(page);
    projectHelpers = new ProjectHelpers(page);

    // 创建测试项目
    await projectHelpers.goToLobby();
    await projectHelpers.createProject({
      title: 'Echo测试项目',
      genre: '玄幻',
      premise: '测试Echo功能',
    });

    // 进入Echo模块
    await echoHelpers.goToEcho();
  });

  test('应该能够创建新Echo', async ({ page }) => {
    const echoData = {
      title: '伏笔测试',
      content: '这是一个重要的伏笔',
      type: 'foreshadowing',
    };

    await echoHelpers.createEcho(echoData);

    // 验证Echo已创建
    await echoHelpers.expectEchoInList(echoData.title);

    // 验证Echo详情显示
    await expect(page.locator(`[data-testid="echo-content-${echoData.title}"]`)).toContainText(echoData.content);
  });

  test('应该能够编辑Echo', async ({ page }) => {
    // 创建Echo
    await echoHelpers.createEcho({
      title: '可编辑的Echo',
      content: '原始内容',
    });

    // 点击编辑
    await page.click('[data-testid="edit-echo-可编辑的Echo"]');

    // 修改内容
    await page.fill('[data-testid="echo-content-input"]', '更新后的内容');

    // 保存
    await page.click('[data-testid="save-echo-button"]');

    // 验证更新成功
    await expect(page.locator('[data-testid="echo-content-可编辑的Echo"]')).toContainText('更新后的内容');
  });

  test('应该能够删除Echo', async ({ page }) => {
    // 创建Echo
    await echoHelpers.createEcho({
      title: '待删除的Echo',
      content: '这个Echo将被删除',
    });

    // 删除
    await page.click('[data-testid="delete-echo-待删除的Echo"]');
    await page.click('[data-testid="confirm-delete-button"]');

    // 验证删除成功
    await echoHelpers.expectEchoNotInList('待删除的Echo');
  });

  test('应该能够按类型筛选Echo', async ({ page }) => {
    // 创建不同类型的Echo
    await echoHelpers.createEcho({
      title: '伏笔1',
      content: '伏笔内容',
      type: 'foreshadowing',
    });

    await echoHelpers.createEcho({
      title: '冲突1',
      content: '冲突内容',
      type: 'conflict',
    });

    // 按类型筛选
    await page.selectOption('[data-testid="echo-type-filter"]', 'foreshadowing');

    // 验证只显示伏笔类型
    await echoHelpers.expectEchoInList('伏笔1');
    await echoHelpers.expectEchoNotInList('冲突1');
  });

  test('应该能够搜索Echo', async ({ page }) => {
    // 创建多个Echo
    await echoHelpers.createEcho({
      title: '重要的伏笔',
      content: '关于主角的秘密',
    });

    await echoHelpers.createEcho({
      title: '次要的伏笔',
      content: '关于配角的秘密',
    });

    // 搜索
    await page.fill('[data-testid="echo-search-input"]', '主角');

    // 验证搜索结果
    await echoHelpers.expectEchoInList('重要的伏笔');
    await echoHelpers.expectEchoNotInList('次要的伏笔');
  });

  test('应该能够关联角色', async ({ page }) => {
    // 假设项目中已有角色
    // 首先创建一个Echo
    await echoHelpers.createEcho({
      title: '角色关联测试',
      content: '与主角相关的伏笔',
    });

    // 打开关联面板
    await page.click('[data-testid="link-character-button"]');

    // 选择角色
    await page.click('[data-testid="character-主角"]');

    // 保存关联
    await page.click('[data-testid="save-link-button"]');

    // 验证关联显示
    await expect(page.locator('[data-testid="echo-linked-characters"]')).toContainText('主角');
  });
});

test.describe('Echo分析与建议', () => {
  test('应该提供Echo改进建议', async ({ page }) => {
    const projectHelpers = new ProjectHelpers(page);
    const echoHelpers = new EchoHelpers(page);

    await projectHelpers.goToLobby();
    await projectHelpers.createProject({
      title: 'AI分析测试',
      genre: '玄幻',
    });

    await echoHelpers.goToEcho();

    // 创建一个需要改进的Echo
    await echoHelpers.createEcho({
      title: '模糊的伏笔',
      content: '有些事情可能会发生',
    });

    // 点击AI分析按钮
    await page.click('[data-testid="analyze-echo-button"]');

    // 等待分析完成
    await page.waitForSelector('[data-testid="analysis-result"]', { timeout: 15000 });

    // 验证建议显示
    await expect(page.locator('[data-testid="analysis-suggestion"]')).toBeVisible();
  });

  test('应该检测Echo矛盾', async ({ page }) => {
    const projectHelpers = new ProjectHelpers(page);
    const echoHelpers = new EchoHelpers(page);

    await projectHelpers.goToLobby();
    await projectHelpers.createProject({
      title: '矛盾检测测试',
      genre: '仙侠',
    });

    await echoHelpers.goToEcho();

    // 创建两个矛盾的Echo
    await echoHelpers.createEcho({
      title: 'Echo1',
      content: '主角擅长火系法术',
    });

    await echoHelpers.createEcho({
      title: 'Echo2',
      content: '主角不会任何法术',
    });

    // 运行矛盾检测
    await page.click('[data-testid="check-contradictions-button"]');

    // 等待检测完成
    await page.waitForSelector('[data-testid="contradiction-report"]', { timeout: 15000 });

    // 验证矛盾被发现
    await expect(page.locator('[data-testid="contradiction-found"]')).toBeVisible();
  });
});

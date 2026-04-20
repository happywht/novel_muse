/**
 * 创世纪流程 E2E 测试
 */

import { test, expect } from '@playwright/test';
import { ForgeHelpers, ProjectHelpers } from './helpers';

test.describe('创世纪流程', () => {
  let forgeHelpers: ForgeHelpers;
  let projectHelpers: ProjectHelpers;

  test.beforeEach(async ({ page }) => {
    forgeHelpers = new ForgeHelpers(page);
    projectHelpers = new ProjectHelpers(page);

    // 创建测试项目
    await projectHelpers.goToLobby();
    await projectHelpers.createProject({
      title: '创世纪测试项目',
      genre: '玄幻',
      premise: '测试创世纪功能',
    });

    // 进入创世纪模块
    await forgeHelpers.goToForge();
  });

  test('应该能够启动创世纪流程', async ({ page }) => {
    // 启动创世纪
    await forgeHelpers.startGenesis();

    // 验证进度指示器显示
    await expect(page.locator('[data-testid="genesis-progress"]')).toBeVisible();

    // 验证进度信息更新
    await expect(page.locator('[data-testid="genesis-status"]')).toContainText(/正在生成|generating/i);
  });

  test('应该完成创世纪并生成世界元素', async ({ page }) => {
    // 启动创世纪
    await forgeHelpers.startGenesis();

    // 等待完成
    await forgeHelpers.waitForGenesisComplete();

    // 验证世界元素已生成
    await forgeHelpers.expectWorldElementsGenerated();

    // 验证角色列表不为空
    const charactersCount = await page.locator('[data-testid="world-characters-list"] > div').count();
    expect(charactersCount).toBeGreaterThan(0);

    // 验证世界设置不为空
    const settingsCount = await page.locator('[data-testid="world-settings-list"] > div').count();
    expect(settingsCount).toBeGreaterThan(0);
  });

  test('应该显示创世纪进度详情', async ({ page }) => {
    await forgeHelpers.startGenesis();

    // 验证各个阶段的进度显示
    const stages = ['生成世界背景', '创建角色', '建立力量体系', '生成初始事件'];

    for (const stage of stages) {
      await expect(page.locator(`[data-testid="genesis-stage-${stage}"]`)).toBeVisible({ timeout: 30000 });
    }
  });

  test('应该能够取消创世纪流程', async ({ page }) => {
    await forgeHelpers.startGenesis();

    // 点击取消按钮
    await page.click('[data-testid="cancel-genesis-button"]');

    // 验证取消确认对话框
    await expect(page.locator('[data-testid="cancel-confirm-dialog"]')).toBeVisible();

    // 确认取消
    await page.click('[data-testid="confirm-cancel-button"]');

    // 验证进度消失
    await expect(page.locator('[data-testid="genesis-progress"]')).not.toBeVisible();
  });

  test('应该在创世纪完成后显示结果摘要', async ({ page }) => {
    await forgeHelpers.startGenesis();
    await forgeHelpers.waitForGenesisComplete();

    // 验证摘要信息显示
    await expect(page.locator('[data-testid="genesis-summary"]')).toBeVisible();

    // 验证统计数据
    await expect(page.locator('[data-testid="genesis-characters-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="genesis-settings-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="genesis-events-count"]')).toBeVisible();
  });

  test('应该能够重新运行创世纪', async ({ page }) => {
    // 第一次创世纪
    await forgeHelpers.startGenesis();
    await forgeHelpers.waitForGenesisComplete();

    // 记录第一次的结果
    const firstCharactersCount = await page.locator('[data-testid="world-characters-list"] > div').count();

    // 点击重新生成
    await page.click('[data-testid="regenerate-world-button"]');

    // 确认重新生成
    await page.click('[data-testid="confirm-regenerate-button"]');

    // 等待新的创世纪完成
    await forgeHelpers.waitForGenesisComplete();

    // 验证已生成新的内容（角色数量可能不同）
    const secondCharactersCount = await page.locator('[data-testid="world-characters-list"] > div').count();
    expect(secondCharactersCount).toBeGreaterThan(0);
  });
});

test.describe('创世纪配置', () => {
  test('应该能够自定义创世纪参数', async ({ page }) => {
    const projectHelpers = new ProjectHelpers(page);
    const forgeHelpers = new ForgeHelpers(page);

    await projectHelpers.goToLobby();
    await projectHelpers.createProject({
      title: '配置测试',
      genre: '仙侠',
    });

    await forgeHelpers.goToForge();

    // 打开配置面板
    await page.click('[data-testid="genesis-config-button"]');

    // 调整参数
    await page.selectOption('[data-testid="detail-level-select"]', 'Detailed');
    await page.selectOption('[data-testid="world-focus-select"]', 'Character');

    // 保存配置
    await page.click('[data-testid="save-config-button"]');

    // 启动创世纪
    await forgeHelpers.startGenesis();
    await forgeHelpers.waitForGenesisComplete();

    // 验证生成结果符合配置（角色数量应该更多）
    const charactersCount = await page.locator('[data-testid="world-characters-list"] > div').count();
    expect(charactersCount).toBeGreaterThan(5); // 期望更多角色
  });

  test('应该保存创世纪配置', async ({ page }) => {
    const projectHelpers = new ProjectHelpers(page);
    const forgeHelpers = new ForgeHelpers(page);

    await projectHelpers.goToLobby();
    await projectHelpers.createProject({
      title: '配置保存测试',
      genre: '玄幻',
    });

    await forgeHelpers.goToForge();

    // 设置配置
    await page.click('[data-testid="genesis-config-button"]');
    await page.selectOption('[data-testid="detail-level-select"]', 'Standard');
    await page.click('[data-testid="save-config-button"]');

    // 退出并重新进入
    await projectHelpers.goToLobby();
    await forgeHelpers.goToForge();

    // 验证配置已保存
    await page.click('[data-testid="genesis-config-button"]');
    await expect(page.locator('[data-testid="detail-level-select"]')).toHaveValue('Standard');
  });
});

/**
 * Prompt Service
 * Prompt管理服务 - 支持高级版的自定义prompt功能
 */

import { FeatureFlagService } from '../config/featureFlags';
import { storageService, STORAGE_KEYS } from './storageService';
import { PROMPT_REGISTRY_LITERARY, PROMPT_REGISTRY_WEB_NOVEL } from '../config/prompts';

export interface CustomPrompt {
  id: string;
  key: string;
  label: string;
  instruction: string;
  createdAt: number;
  updatedAt: number;
  isDefault: boolean;
}

export interface PromptVersion {
  id: string;
  promptKey: string;
  instruction: string;
  version: number;
  createdAt: number;
  note?: string;
}

export class PromptService {
  private static instance: PromptService;
  private featureFlags: FeatureFlagService;
  private customPrompts: Map<string, CustomPrompt> = new Map();
  private promptVersions: Map<string, PromptVersion[]> = new Map();

  private constructor() {
    this.featureFlags = FeatureFlagService.getInstance();
  }

  static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService();
    }
    return PromptService.instance;
  }

  /**
   * 初始化服务，加载自定义prompts
   */
  async initialize(): Promise<void> {
    await this.loadCustomPrompts();
    await this.loadPromptVersions();
  }

  /**
   * 获取Prompt
   * 普通版：返回默认prompt
   * 高级版：优先返回自定义prompt，无则返回默认
   */
  async getPrompt(key: string, profile: 'LITERARY' | 'WEB_NOVEL' = 'WEB_NOVEL'): Promise<string> {
    // 高级版：检查自定义prompt
    if (this.featureFlags.isEnabled('promptEditing')) {
      const customPrompt = this.customPrompts.get(key);
      if (customPrompt) {
        return customPrompt.instruction;
      }
    }

    // 返回默认prompt
    const registry = profile === 'LITERARY' ? PROMPT_REGISTRY_LITERARY : PROMPT_REGISTRY_WEB_NOVEL;
    const template = registry[key];

    if (!template) {
      console.warn(`Prompt key "${key}" not found, using fallback`);
      return '你是一个专业的创意写作助手。';
    }

    return template.instruction;
  }

  /**
   * 保存自定义Prompt（仅高级版）
   */
  async saveCustomPrompt(key: string, instruction: string, note?: string): Promise<void> {
    this.featureFlags.requirePremium('自定义Prompt');

    const existing = this.customPrompts.get(key);
    const prompt: CustomPrompt = {
      id: existing?.id || `prompt-${Date.now()}`,
      key,
      label: existing?.label || key,
      instruction,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      isDefault: false,
    };

    // 保存版本历史
    if (existing) {
      await this.savePromptVersion(key, existing.instruction, note);
    }

    this.customPrompts.set(key, prompt);
    await this.persistCustomPrompts();
  }

  /**
   * 删除自定义Prompt（仅高级版）
   */
  async deleteCustomPrompt(key: string): Promise<void> {
    this.featureFlags.requirePremium('删除自定义Prompt');

    this.customPrompts.delete(key);
    await this.persistCustomPrompts();
  }

  /**
   * 重置为默认Prompt
   */
  async resetToDefault(key: string): Promise<void> {
    this.featureFlags.requirePremium('重置Prompt');

    this.customPrompts.delete(key);
    await this.persistCustomPrompts();
  }

  /**
   * 获取所有Prompts（包括默认和自定义）
   */
  async getAllPrompts(
    profile: 'LITERARY' | 'WEB_NOVEL' = 'WEB_NOVEL'
  ): Promise<Record<string, any>> {
    const registry = profile === 'LITERARY' ? PROMPT_REGISTRY_LITERARY : PROMPT_REGISTRY_WEB_NOVEL;
    const result: Record<string, any> = { ...registry };

    // 高级版：合并自定义prompts
    if (this.featureFlags.isEnabled('promptEditing')) {
      this.customPrompts.forEach((custom, key) => {
        if (result[key]) {
          result[key] = {
            ...result[key],
            instruction: custom.instruction,
            isCustom: true,
          };
        }
      });
    }

    return result;
  }

  /**
   * 获取Prompt版本历史（仅高级版）
   */
  async getVersionHistory(key: string): Promise<PromptVersion[]> {
    this.featureFlags.requirePremium('Prompt版本历史');

    return this.promptVersions.get(key) || [];
  }

  /**
   * 恢复到指定版本（仅高级版）
   */
  async restoreVersion(key: string, versionId: string): Promise<void> {
    this.featureFlags.requirePremium('恢复Prompt版本');

    const versions = this.promptVersions.get(key);
    if (!versions) {
      throw new Error('未找到版本历史');
    }

    const version = versions.find((v) => v.id === versionId);
    if (!version) {
      throw new Error('未找到指定版本');
    }

    await this.saveCustomPrompt(key, version.instruction, `恢复到版本 ${version.version}`);
  }

  /**
   * 加载自定义Prompts
   */
  private async loadCustomPrompts(): Promise<void> {
    if (!this.featureFlags.isEnabled('customPromptLibrary')) {
      return;
    }

    try {
      const saved = await storageService.getItem<CustomPrompt[]>(STORAGE_KEYS.CUSTOM_PROMPTS);
      if (saved && Array.isArray(saved)) {
        saved.forEach((p) => this.customPrompts.set(p.key, p));
      }
    } catch (error) {
      console.error('Failed to load custom prompts:', error);
    }
  }

  /**
   * 持久化自定义Prompts
   */
  private async persistCustomPrompts(): Promise<void> {
    try {
      const prompts = Array.from(this.customPrompts.values());
      await storageService.setItem(STORAGE_KEYS.CUSTOM_PROMPTS, prompts);
    } catch (error) {
      console.error('Failed to persist custom prompts:', error);
      throw error;
    }
  }

  /**
   * 保存Prompt版本
   */
  private async savePromptVersion(key: string, instruction: string, note?: string): Promise<void> {
    if (!this.promptVersions.has(key)) {
      this.promptVersions.set(key, []);
    }

    const versions = this.promptVersions.get(key)!;
    const lastVersion = versions.length > 0 ? versions[versions.length - 1].version : 0;

    const newVersion: PromptVersion = {
      id: `version-${Date.now()}`,
      promptKey: key,
      instruction,
      version: lastVersion + 1,
      createdAt: Date.now(),
      note,
    };

    versions.push(newVersion);
    await this.persistPromptVersions();
  }

  /**
   * 加载Prompt版本历史
   */
  private async loadPromptVersions(): Promise<void> {
    if (!this.featureFlags.isEnabled('promptEditing')) {
      return;
    }

    try {
      const saved = await storageService.getItem<Record<string, PromptVersion[]>>(
        STORAGE_KEYS.PROMPT_VERSIONS
      );
      if (saved) {
        Object.entries(saved).forEach(([key, versions]) => {
          this.promptVersions.set(key, versions);
        });
      }
    } catch (error) {
      console.error('Failed to load prompt versions:', error);
    }
  }

  /**
   * 持久化Prompt版本历史
   */
  private async persistPromptVersions(): Promise<void> {
    try {
      const versionsObj: Record<string, PromptVersion[]> = {};
      this.promptVersions.forEach((versions, key) => {
        versionsObj[key] = versions;
      });
      await storageService.setItem(STORAGE_KEYS.PROMPT_VERSIONS, versionsObj);
    } catch (error) {
      console.error('Failed to persist prompt versions:', error);
    }
  }
}

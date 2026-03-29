/**
 * 轻量级 Prompt 模板引擎服务
 * 支持变量替换、条件渲染、循环渲染
 */

export interface CompiledTemplate {
  (variables: Record<string, any>): string;
}

export interface TemplateVariable {
  name: string;
  type: 'variable' | 'condition' | 'loop';
}

/**
 * Prompt 模板引擎
 */
export class PromptTemplateEngine {
  private cache: Map<string, CompiledTemplate> = new Map();
  private variablePattern = /\{\{([^}]+)\}\}/g;
  private conditionPattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  private loopPattern = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  /**
   * 编译模板，返回渲染函数
   * @param template 模板字符串
   * @returns 渲染函数
   */
  compile(template: string): CompiledTemplate {
    // 检查缓存
    const cacheKey = this.generateCacheKey(template);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 预处理模板
    const processedTemplate = this.preprocessTemplate(template);

    // 创建渲染函数
    const renderFn: CompiledTemplate = (variables: Record<string, any>) => {
      return this.renderProcessedTemplate(processedTemplate, variables);
    };

    // 缓存编译结果
    this.cache.set(cacheKey, renderFn);

    return renderFn;
  }

  /**
   * 渲染模板
   * @param template 模板字符串
   * @param variables 变量对象
   * @returns 渲染后的字符串
   */
  render(template: string, variables: Record<string, any> = {}): string {
    const renderFn = this.compile(template);
    return renderFn(variables);
  }

  /**
   * 提取模板中的变量列表
   * @param template 模板字符串
   * @returns 变量列表
   */
  extractVariables(template: string): TemplateVariable[] {
    const variables: TemplateVariable[] = [];
    const seen = new Set<string>();

    // 提取普通变量
    let match;
    this.variablePattern.lastIndex = 0;
    while ((match = this.variablePattern.exec(template)) !== null) {
      const varName = match[1].trim();
      // 排除条件语句和循环语句的标记
      if (!varName.startsWith('#') && !varName.startsWith('/')) {
        if (!seen.has(varName)) {
          seen.add(varName);
          variables.push({ name: varName, type: 'variable' });
        }
      }
    }

    // 提取条件变量
    this.conditionPattern.lastIndex = 0;
    while ((match = this.conditionPattern.exec(template)) !== null) {
      const varName = match[1].trim();
      if (!seen.has(varName)) {
        seen.add(varName);
        variables.push({ name: varName, type: 'condition' });
      }
    }

    // 提取循环变量
    this.loopPattern.lastIndex = 0;
    while ((match = this.loopPattern.exec(template)) !== null) {
      const varName = match[1].trim();
      if (!seen.has(varName)) {
        seen.add(varName);
        variables.push({ name: varName, type: 'loop' });
      }
    }

    return variables;
  }

  /**
   * 估算文本的 token 数量
   * 简单估算：中文约 1.5 字符/token，英文约 4 字符/token
   * @param text 要估算的文本
   * @returns token 数量估算
   */
  estimateTokens(text: string): number {
    if (!text) return 0;

    // 分离中文和非中文字符
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const nonChineseText = text.replace(/[\u4e00-\u9fa5]/g, '');

    // 估算 token 数量
    const chineseTokens = Math.ceil(chineseChars.length / 1.5);
    const nonChineseTokens = Math.ceil(nonChineseText.length / 4);

    return chineseTokens + nonChineseTokens;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * 预处理模板
   * 将模板转换为中间表示
   */
  private preprocessTemplate(template: string): string {
    return template;
  }

  /**
   * 渲染预处理后的模板
   */
  private renderProcessedTemplate(template: string, variables: Record<string, any>): string {
    let result = template;

    // 1. 先处理循环
    result = this.processLoops(result, variables);

    // 2. 再处理条件
    result = this.processConditions(result, variables);

    // 3. 最后处理变量替换
    result = this.processVariables(result, variables);

    return result;
  }

  /**
   * 处理循环语句
   */
  private processLoops(template: string, variables: Record<string, any>): string {
    return template.replace(this.loopPattern, (match, varName: string, content: string) => {
      const items = this.getVariableValue(variables, varName);

      if (!Array.isArray(items) || items.length === 0) {
        return '';
      }

      return items
        .map((item, index) => {
          let itemContent = content;

          // 替换 {{this}} 为当前项
          itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));

          // 替换 {{@index}} 为索引
          itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));

          // 如果项是对象，替换其属性
          if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach((key) => {
              const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
              itemContent = itemContent.replace(pattern, String(item[key] ?? ''));
            });
          }

          return itemContent;
        })
        .join('');
    });
  }

  /**
   * 处理条件语句
   */
  private processConditions(template: string, variables: Record<string, any>): string {
    return template.replace(this.conditionPattern, (match, varName: string, content: string) => {
      const value = this.getVariableValue(variables, varName);

      // 检查条件是否为真
      if (this.isTruthy(value)) {
        return content;
      }

      return '';
    });
  }

  /**
   * 处理变量替换
   */
  private processVariables(template: string, variables: Record<string, any>): string {
    return template.replace(this.variablePattern, (match, varName: string) => {
      const trimmedVarName = varName.trim();

      // 跳过已处理的特殊标记
      if (trimmedVarName.startsWith('#') || trimmedVarName.startsWith('/')) {
        return match;
      }

      const value = this.getVariableValue(variables, trimmedVarName);
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /**
   * 获取变量值
   * 支持嵌套路径，如 "user.name"
   */
  private getVariableValue(variables: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let value: any = variables;

    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * 检查值是否为真
   */
  private isTruthy(value: any): boolean {
    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.length > 0;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }

    return Boolean(value);
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(template: string): string {
    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < template.length; i++) {
      const char = template.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `template_${hash}`;
  }
}

// 导出单例实例
export const templateEngine = new PromptTemplateEngine();

// 导出便捷函数
export const renderTemplate = (template: string, variables: Record<string, any>) =>
  templateEngine.render(template, variables);

export const compileTemplate = (template: string) => templateEngine.compile(template);

export const extractVariables = (template: string) => templateEngine.extractVariables(template);

export const estimateTokens = (text: string) => templateEngine.estimateTokens(text);

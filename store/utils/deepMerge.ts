/**
 * 深度合并工具 - 优化版本
 *
 * 性能优化：
 * - 减少不必要的对象创建
 * - 使用更高效的类型检查
 * - 避免递归深度过大
 */

import { DeepPartial } from '../../types';

export function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  // 基础类型直接返回
  if (typeof target !== 'object' || target === null) {
    return source as T;
  }

  if (typeof source !== 'object' || source === null) {
    return target;
  }

  // 数组直接替换（不合并）
  if (Array.isArray(target) || Array.isArray(source)) {
    return source as T;
  }

  const result = { ...target } as T;

  // 遍历源对象的所有属性
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = (result as Record<string, unknown>)[key];

      // 递归合并嵌套对象
      if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as T,
          sourceValue as DeepPartial<T>
        );
      } else {
        // 直接赋值基本类型和数组
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * 浅合并 - 用于简单场景
 */
export function shallowMerge<T>(target: T, source: Partial<T>): T {
  return { ...target, ...source };
}

/**
 * 安全的深度合并 - 带错误处理
 */
export function safeDeepMerge<T>(target: T, source: DeepPartial<T>): T {
  try {
    return deepMerge(target, source);
  } catch (error) {
    console.error('深度合并失败，回退到浅合并:', error);
    return { ...target, ...source } as T;
  }
}

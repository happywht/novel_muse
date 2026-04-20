/**
 * deepMerge 工具函数测试
 *
 * 测试深度合并功能
 */

import { describe, it, expect } from 'vitest';
import { deepMerge, shallowMerge, safeDeepMerge } from '../store/utils/deepMerge';

describe('deepMerge', () => {
  describe('基础合并', () => {
    it('应该合并两个简单对象', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('应该不修改原始对象', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      deepMerge(target, source);

      expect(target).toEqual({ a: 1 });
      expect(source).toEqual({ b: 2 });
    });

    it('应该返回新对象', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      const result = deepMerge(target, source);

      expect(result).not.toBe(target);
      expect(result).not.toBe(source);
    });
  });

  describe('深度合并', () => {
    it('应该深度合并嵌套对象', () => {
      const target = {
        a: 1,
        nested: { x: 1, y: 2 },
      };
      const source = {
        nested: { y: 3, z: 4 },
      };
      const result = deepMerge(target, source);

      expect(result).toEqual({
        a: 1,
        nested: { x: 1, y: 3, z: 4 },
      });
    });

    it('应该处理多层嵌套', () => {
      const target = {
        level1: {
          level2: {
            level3: { a: 1 },
          },
        },
      };
      const source = {
        level1: {
          level2: {
            level3: { b: 2 },
          },
        },
      };
      const result = deepMerge(target, source);

      expect(result.level1.level2.level3).toEqual({ a: 1, b: 2 });
    });
  });

  describe('数组处理', () => {
    it('应该替换数组而不是合并', () => {
      const target = { arr: [1, 2, 3] };
      const source = { arr: [4, 5] };
      const result = deepMerge(target, source);

      expect(result.arr).toEqual([4, 5]);
    });

    it('应该处理嵌套数组', () => {
      const target = {
        nested: { arr: [1, 2] },
      };
      const source = {
        nested: { arr: [3, 4] },
      };
      const result = deepMerge(target, source);

      expect(result.nested.arr).toEqual([3, 4]);
    });
  });

  describe('undefined值处理', () => {
    it('应该保留undefined值', () => {
      const target = { a: 1, b: 2 };
      const source = { b: undefined, c: 3 };
      const result = deepMerge(target, source);

      // 实际行为：undefined会被合并进去
      expect(result).toEqual({ a: 1, b: undefined, c: 3 });
    });

    it('应该处理嵌套对象中的undefined', () => {
      const target = {
        nested: { a: 1, b: 2 },
      };
      const source = {
        nested: { b: undefined, c: 3 },
      };
      const result = deepMerge(target, source);

      // 实际行为：undefined会被合并进去
      expect(result.nested).toEqual({ a: 1, b: undefined, c: 3 });
    });
  });

  describe('null值处理', () => {
    it('应该保留null值', () => {
      const target = { a: 1 };
      const source = { b: null };
      const result = deepMerge(target, source);

      expect(result.b).toBeNull();
    });

    it('应该覆盖为null', () => {
      const target = { a: 1 };
      const source = { a: null };
      const result = deepMerge(target, source);

      expect(result.a).toBeNull();
    });
  });

  describe('复杂场景', () => {
    it('应该合并复杂配置对象', () => {
      const target = {
        name: 'Project',
        config: {
          enabled: true,
          options: { opt1: 'a', opt2: 'b' },
        },
        metadata: { version: 1 },
      };
      const source = {
        config: {
          options: { opt2: 'c', opt3: 'd' },
        },
        metadata: { author: 'test' },
      };
      const result = deepMerge(target, source);

      expect(result).toEqual({
        name: 'Project',
        config: {
          enabled: true,
          options: { opt1: 'a', opt2: 'c', opt3: 'd' },
        },
        metadata: { version: 1, author: 'test' },
      });
    });

    it('应该处理空对象', () => {
      const target = { a: 1 };
      const source = {};
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1 });
    });

    it('应该处理空source', () => {
      const target = { a: 1 };
      const result = deepMerge(target, {} as any);

      expect(result).toEqual({ a: 1 });
    });
  });

  describe('边界条件', () => {
    it('应该处理大对象', () => {
      const target = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`key${i}`, i])
      );
      const source = { key50: 999, newKey: 1000 };
      const result = deepMerge(target, source);

      expect(result.key50).toBe(999);
      expect(result.newKey).toBe(1000);
      expect(result.key0).toBe(0);
    });

    it('应该处理特殊字符键', () => {
      const target = { 'key-with-dash': 1 };
      const source = { 'key_with_underscore': 2 };
      const result = deepMerge(target, source);

      expect(result).toEqual({
        'key-with-dash': 1,
        'key_with_underscore': 2,
      });
    });
  });

  describe('类型安全', () => {
    it('应该保持类型一致性', () => {
      interface TestType {
        num: number;
        str: string;
        bool: boolean;
        obj: { nested: string };
      }
      const target: TestType = {
        num: 1,
        str: 'test',
        bool: true,
        obj: { nested: 'value' },
      };
      const source = {
        num: 2,
        str: 'updated',
      };
      const result = deepMerge<TestType>(target, source as any);

      expect(result.num).toBe(2);
      expect(result.str).toBe('updated');
      expect(result.bool).toBe(true);
      expect(result.obj.nested).toBe('value');
    });
  });
});

describe('shallowMerge', () => {
  it('应该浅合并对象', () => {
    const target = { a: 1, nested: { x: 1 } };
    const source = { b: 2, nested: { y: 2 } };
    const result = shallowMerge(target, source);

    expect(result).toEqual({ a: 1, b: 2, nested: { y: 2 } });
  });

  it('应该不深度合并嵌套对象', () => {
    const target = { nested: { x: 1, y: 2 } };
    const source = { nested: { y: 3 } };
    const result = shallowMerge(target, source);

    // 浅合并应该完全替换嵌套对象
    expect(result.nested).toEqual({ y: 3 });
    expect(result.nested).not.toEqual({ x: 1, y: 3 });
  });
});

describe('safeDeepMerge', () => {
  it('应该安全处理undefined source', () => {
    const target = { a: 1 };
    const result = safeDeepMerge(target, undefined as any);

    expect(result).toEqual({ a: 1 });
  });

  it('应该安全处理null source', () => {
    const target = { a: 1 };
    const result = safeDeepMerge(target, null as any);

    expect(result).toEqual({ a: 1 });
  });

  it('应该安全处理非对象source', () => {
    const target = { a: 1 };
    const result = safeDeepMerge(target, 'invalid' as any);

    expect(result).toEqual({ a: 1 });
  });

  it('应该正常处理有效source', () => {
    const target = { a: 1 };
    const source = { b: 2 };
    const result = safeDeepMerge(target, source);

    expect(result).toEqual({ a: 1, b: 2 });
  });
});

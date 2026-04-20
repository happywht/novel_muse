/**
 * Vitest 测试环境设置
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// 扩展 Vitest 的 expect 断言
expect.extend(matchers);

// 每个测试后清理
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  clear: () => {},
};

global.localStorage = localStorageMock as Storage;

// Mock IndexedDB
global.indexedDB = {
  open: () => ({}),
  deleteDatabase: () => ({}),
  databases: () => [],
} as any;

// Mock fetch
global.fetch = vi.fn();

// Mock AbortSignal
if (!global.AbortSignal) {
  global.AbortSignal = class AbortSignal {
    aborted = false;
    reason: any;
    onabort: ((...args: any[]) => any) | null = null;
    throwIfAborted() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return false;
    }
  } as any;
}

// Mock performance API
global.performance = {
  ...performance,
  mark: vi.fn(),
  measure: vi.fn(),
} as any;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock D3
vi.mock('d3', () => ({
  forceSimulation: vi.fn(() => ({
    force: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    alpha: vi.fn().mockReturnThis(),
    alphaTarget: vi.fn().mockReturnThis(),
    restart: vi.fn().mockReturnThis(),
  })),
  forceLink: vi.fn(() => ({
    id: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
    strength: vi.fn().mockReturnThis(),
  })),
  forceManyBody: vi.fn(() => ({ strength: vi.fn().mockReturnThis() })),
  forceCenter: vi.fn(() => ({})),
  forceCollide: vi.fn(() => ({ radius: vi.fn().mockReturnThis(), iterations: vi.fn().mockReturnThis() })),
  forceX: vi.fn(() => ({ strength: vi.fn().mockReturnThis() })),
  forceY: vi.fn(() => ({ strength: vi.fn().mockReturnThis() })),
  link: vi.fn(() => []),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
  })),
  zoomIdentity: { x: 0, y: 0, k: 1 },
  select: vi.fn(() => ({
    call: vi.fn().mockReturnThis(),
    transition: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
  })),
}));

// Mock store and API
vi.mock('@/store', () => ({
  useProjectStore: vi.fn(() => ({
    project: {
      characters: [],
      worldSettings: [],
      echoes: [],
    },
  })),
}));

vi.mock('@/services/apiService', () => ({
  apiService: {
    project: {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Import vitest globals
declare global {
  const vi: typeof import('vitest');
  const describe: typeof import('vitest').describe;
  const it: typeof import('vitest').it;
  const test: typeof import('vitest').test;
  const expect: typeof import('vitest').expect;
  const beforeEach: typeof import('vitest').beforeEach;
  const afterEach: typeof import('vitest').afterEach;
  const beforeAll: typeof import('vitest').beforeAll;
  const afterAll: typeof import('vitest').afterAll;
  const vi: typeof import('vitest').vi;
}

/**
 * useAsyncRequest Hook
 *
 * 统一管理异步请求的生命周期，防止竞态条件和内存泄漏
 * 提供AbortController支持、自动清理、请求去重等功能
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface RequestOptions {
  signal?: AbortSignal;
  timeout?: number;
  deduplicate?: boolean;
}

interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  aborted: boolean;
}

/**
 * Hook用于管理异步请求的生命周期
 * @param asyncFn 异步函数
 * @param options 请求选项
 */
export function useAsyncRequest<T>(
  asyncFn: (signal: AbortSignal) => Promise<T>,
  options: RequestOptions = {}
) {
  const { timeout = 30000, deduplicate = true } = options;

  const [state, setState] = useState<RequestState<T>>({
    data: null,
    loading: false,
    error: null,
    aborted: false
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const pendingRequestIdRef = useRef<string | null>(null);

  // 清理函数
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isMountedRef.current = false;
  }, []);

  // 执行请求
  const execute = useCallback(async (): Promise<T | null> => {
    // 如果正在请求且启用去重，则返回当前promise
    if (deduplicate && state.loading && pendingRequestIdRef.current) {
      return null;
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    pendingRequestIdRef.current = requestId;

    // 设置超时
    const timeoutId = setTimeout(() => {
      if (controller.signal.aborted === false) {
        controller.abort();
      }
    }, timeout);

    setState({
      data: null,
      loading: true,
      error: null,
      aborted: false
    });

    try {
      const result = await asyncFn(controller.signal);

      // 只在组件仍挂载且请求未被取消时更新状态
      if (isMountedRef.current && pendingRequestIdRef.current === requestId && !controller.signal.aborted) {
        setState({
          data: result,
          loading: false,
          error: null,
          aborted: false
        });
        return result;
      } else if (controller.signal.aborted) {
        setState(prev => ({
          ...prev,
          loading: false,
          aborted: true
        }));
        return null;
      }

      return result;
    } catch (error) {
      // 只在组件仍挂载且是当前请求时更新错误状态
      if (isMountedRef.current && pendingRequestIdRef.current === requestId) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            setState({
              data: null,
              loading: false,
              error: null,
              aborted: true
            });
          } else {
            setState({
              data: null,
              loading: false,
              error,
              aborted: false
            });
          }
        }
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
      if (pendingRequestIdRef.current === requestId) {
        pendingRequestIdRef.current = null;
      }
    }
  }, [asyncFn, timeout, deduplicate, state.loading]);

  // 手动取消请求
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({
        ...prev,
        loading: false,
        aborted: true
      }));
    }
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      aborted: false
    });
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    execute,
    abort,
    reset,
    isRequestActive: state.loading || pendingRequestIdRef.current !== null
  };
}

/**
 * Hook用于批量管理多个异步请求
 */
export function useAsyncRequestBatch<T>(
  asyncFns: Array<(signal: AbortSignal) => Promise<T>>,
  options: RequestOptions = {}
) {
  const [results, setResults] = useState<(T | null)[]>(new Array(asyncFns.length).fill(null));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<(Error | null)[]>(new Array(asyncFns.length).fill(null));

  const abortControllersRef = useRef<AbortController[]>([]);

  const executeAll = useCallback(async (): Promise<(T | null)[]> => {
    // 取消之前的请求
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current = [];

    const controllers = asyncFns.map(() => new AbortController());
    abortControllersRef.current = controllers;

    setLoading(true);
    setErrors(new Array(asyncFns.length).fill(null));

    try {
      const promises = asyncFns.map(async (fn, index) => {
        try {
          return await fn(controllers[index].signal);
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            setErrors(prev => {
              const newErrors = [...prev];
              newErrors[index] = error;
              return newErrors;
            });
          }
          return null;
        }
      });

      const newResults = await Promise.all(promises);

      if (controllers.every(c => c.signal.aborted === false)) {
        setResults(newResults);
        setLoading(false);
        return newResults;
      } else {
        setLoading(false);
        return new Array(asyncFns.length).fill(null);
      }
    } catch (error) {
      setLoading(false);
      return new Array(asyncFns.length).fill(null);
    }
  }, [asyncFns]);

  const abortAll = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current = [];
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      abortAll();
    };
  }, [abortAll]);

  return {
    results,
    loading,
    errors,
    executeAll,
    abortAll
  };
}

/**
 * Hook用于带防抖的异步请求
 */
export function useDebouncedAsyncRequest<T>(
  asyncFn: (signal: AbortSignal) => Promise<T>,
  delay: number = 300,
  options: RequestOptions = {}
) {
  const { execute, abort, ...state } = useAsyncRequest(asyncFn, options);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedExecute = useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      execute();
    }, delay);

    // 返回取消函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      abort();
    };
  }, [execute, abort, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    execute: debouncedExecute,
    abort
  };
}

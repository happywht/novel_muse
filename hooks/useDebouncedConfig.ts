/**
 * Debounced Hooks with Global Config
 * Uses performance.debounce values from global config
 */

import { useState, useEffect, useRef } from 'react';
import { getGlobalConfig } from '../config/global';

/**
 * Debounced value hook that reads delay from global config
 * @param value - The value to debounce
 * @param configKey - The key in performance.debounce ('input' | 'search' | 'sync')
 */
export function useDebouncedValue<T>(value: T, configKey: 'input' | 'search' | 'sync'): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Load delay from global config
    getGlobalConfig().then((config) => {
      const delay = config.performance.debounce[configKey];

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, configKey]);

  return debouncedValue;
}

/**
 * Debounced callback hook that reads delay from global config
 */
export function useDebouncedCallback(
  callback: (...args: any[]) => void,
  configKey: 'input' | 'search' | 'sync'
): (...args: any[]) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (...args: any[]) => {
    getGlobalConfig().then((config) => {
      const delay = config.performance.debounce[configKey];

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    });
  };
}

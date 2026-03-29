import { useState, useCallback } from 'react';

const ADVANCED_MODE_KEY = 'muse_advanced_mode';

export function useAdvancedMode() {
  const [isAdvanced, setIsAdvanced] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(ADVANCED_MODE_KEY);
    return stored === 'true';
  });

  const toggle = useCallback(() => {
    setIsAdvanced((prev) => {
      const newValue = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(ADVANCED_MODE_KEY, String(newValue));
      }
      return newValue;
    });
  }, []);

  const enable = useCallback(() => {
    setIsAdvanced(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADVANCED_MODE_KEY, 'true');
    }
  }, []);

  const disable = useCallback(() => {
    setIsAdvanced(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADVANCED_MODE_KEY, 'false');
    }
  }, []);

  return { isAdvanced, toggle, enable, disable };
}

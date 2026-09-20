'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce any fast-changing value.
 * Commonly used for search inputs to prevent redundant API queries.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

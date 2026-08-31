"use client";

import { useEffect, useState } from "react";

/**
 * Settle a rapidly-changing value before it reaches a query key.
 *
 * Search boxes are now backed by real endpoints (`q` on `/claims/repository`,
 * `/claims`, `/policies`, `/alerts`), so every keystroke would otherwise be a
 * request.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

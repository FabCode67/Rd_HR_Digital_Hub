"use client";

import { useEffect, useState } from "react";

/**
 * Debounces a fast-changing value (typically a search input) so consumers
 * only re-filter/re-fetch after the user pauses typing, instead of on every
 * keystroke. Cheap for small in-memory lists, but avoids unnecessary
 * re-renders/re-computation and matters once lists grow or filtering does
 * heavier work (e.g. scanning nested leave/review records).
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

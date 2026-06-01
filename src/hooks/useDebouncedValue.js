import { useEffect, useState } from "react";

/**
 * useDebouncedValue
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * of no further changes. Lets us keep search inputs responsive while
 * the (heavier) filter/render work runs against a stable value.
 *
 * No business logic — pure UX/perf helper.
 */
export default function useDebouncedValue(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
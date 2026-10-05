const AUTOSAVE_DEBOUNCE_MS = 1000; // 1 second debounce

/**
 * Create a debounced autosave function.
 */
export function createDebouncedAutosave(
  saveFn: () => void | Promise<unknown>,
  delay: number = AUTOSAVE_DEBOUNCE_MS
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      void saveFn();
      timeoutId = null;
    }, delay);
  };
}

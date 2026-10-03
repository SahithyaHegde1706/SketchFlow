// Cache to hold instantiated HTMLImageElements keyed by their src (data URL)
const imageCache: Record<string, HTMLImageElement> = {};
const loadingSet: Set<string> = new Set();
const loadWaiters: Map<string, Set<(image: HTMLImageElement | null) => void>> = new Map();

function resolveLoadWaiters(src: string, image: HTMLImageElement | null): void {
  const waiters = loadWaiters.get(src);
  if (!waiters) return;

  loadWaiters.delete(src);
  for (const resolve of waiters) resolve(image);
}

/**
 * Retrieves a cached image or starts loading it if not cached.
 * 
 * @param src The image data URL to load.
 * @param onLoaded Callback triggered when the image finishes loading, used to trigger canvas redraw.
 * @returns The HTMLImageElement if fully loaded, otherwise null.
 */
export function getOrLoadImage(src: string, onLoaded: () => void): HTMLImageElement | null {
  const cachedImage = imageCache[src];
  if (cachedImage) {
    // If it's already completely loaded and usable
    if (cachedImage.complete && cachedImage.naturalWidth > 0) {
      return cachedImage;
    }
    delete imageCache[src];
  }

  // Prevent duplicate load triggers for the same src
  if (loadingSet.has(src)) {
    return null;
  }

  loadingSet.add(src);

  const img = new Image();
  img.onload = () => {
    loadingSet.delete(src);
    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      resolveLoadWaiters(src, null);
      return;
    }
    // Cache before redrawing so the redraw uses this image instead of starting another load.
    imageCache[src] = img;
    resolveLoadWaiters(src, img);
    onLoaded();
  };
  img.onerror = () => {
    // Silent fail for now; the element just won't render
    loadingSet.delete(src);
    resolveLoadWaiters(src, null);
  };
  
  try {
    img.src = src;
  } catch {
    loadingSet.delete(src);
    resolveLoadWaiters(src, null);
  }

  return null;
}

/** Resolve when the image is cached or unavailable, sharing any in-flight load. */
export function waitForImage(src: string): Promise<HTMLImageElement | null> {
  const cachedImage = imageCache[src];
  if (cachedImage?.complete && cachedImage.naturalWidth > 0) {
    return Promise.resolve(cachedImage);
  }

  return new Promise((resolve) => {
    let waiters = loadWaiters.get(src);
    if (!waiters) {
      waiters = new Set();
      loadWaiters.set(src, waiters);
    }
    waiters.add(resolve);
    getOrLoadImage(src, () => {});
  });
}

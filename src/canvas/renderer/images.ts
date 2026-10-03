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
      console.warn("[SketchFlow] Loaded image has no usable dimensions:", src.startsWith("data:") ? `${src.slice(0, 48)}…` : src);
      resolveLoadWaiters(src, null);
      return;
    }
    imageCache[src] = img;
    resolveLoadWaiters(src, img);
    onLoaded();
  };
  img.onerror = () => {
    loadingSet.delete(src);
    const failedSource = src.startsWith("data:") ? `${src.slice(0, 48)}…` : src;
    console.warn("[SketchFlow] Unable to load image:", failedSource);
    resolveLoadWaiters(src, null);
  };
  
  try {
    img.src = src;
  } catch (error) {
    loadingSet.delete(src);
    console.warn("[SketchFlow] Unable to start image load:", error);
    resolveLoadWaiters(src, null);
  }

  return null;
}

/**
 * Resolves when an image is available in the cache, or with null if it fails.
 * Shares an existing in-flight load and starts one only when necessary.
 */
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

    // This either joins the existing load or starts the same load used by the renderer.
    getOrLoadImage(src, () => {});
  });
}

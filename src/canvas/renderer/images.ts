// Cache to hold instantiated HTMLImageElements keyed by their src (data URL)
const imageCache: Record<string, HTMLImageElement> = {};
const loadingSet: Set<string> = new Set();

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
      return;
    }
    // Cache before redrawing so the redraw uses this image instead of starting another load.
    imageCache[src] = img;
    onLoaded();
  };
  img.onerror = () => {
    // Silent fail for now; the element just won't render
    loadingSet.delete(src);
  };
  
  try {
    img.src = src;
  } catch {
    loadingSet.delete(src);
  }

  return null;
}

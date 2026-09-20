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
  if (imageCache[src]) {
    // If it's already completely loaded and usable
    if (imageCache[src].complete && imageCache[src].naturalWidth > 0) {
      return imageCache[src];
    }
    return null;
  }

  // Prevent duplicate load triggers for the same src
  if (loadingSet.has(src)) {
    return null;
  }

  loadingSet.add(src);

  const img = new Image();
  img.onload = () => {
    imageCache[src] = img;
    loadingSet.delete(src);
    onLoaded();
  };
  img.onerror = () => {
    // Silent fail for now; the element just won't render
    loadingSet.delete(src);
  };
  
  img.src = src;

  return null;
}

import type { ImageElement } from "@/types/canvas";

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

export function drawImageElement(
  context: CanvasRenderingContext2D,
  image: ImageElement,
  onLoaded: () => void
) {
  const img = getOrLoadImage(image.src, onLoaded);
  if (!img) return; // not loaded yet

  context.save();
  const opacity = image.opacity ?? 1;
  context.globalAlpha = opacity;

  if (image.rotation) {
    const cx = image.x + image.width / 2;
    const cy = image.y + image.height / 2;
    context.translate(cx, cy);
    context.rotate(image.rotation);
    context.translate(-cx, -cy);
  }
  if (image.flipX || image.flipY) {
    const cx = image.x + image.width / 2;
    const cy = image.y + image.height / 2;
    context.translate(cx, cy);
    context.scale(image.flipX ? -1 : 1, image.flipY ? -1 : 1);
    context.translate(-cx, -cy);
  }

  // Apply shadow if specified
  if (image.shadowColor !== undefined) {
    context.shadowColor = image.shadowColor;
    context.shadowBlur = image.shadowBlur ?? 10;
    context.shadowOffsetX = image.shadowOffsetX ?? 5;
    context.shadowOffsetY = image.shadowOffsetY ?? 5;
  }

  // Clip to rounded rectangle if cornerRadius is specified
  const radius = image.cornerRadius ?? 0;
  if (radius > 0) {
    context.beginPath();
    if (typeof context.roundRect === "function") {
      context.roundRect(image.x, image.y, image.width, image.height, radius);
    } else {
      // Fallback for browsers without roundRect support
      const r = Math.min(radius, image.width / 2, image.height / 2);
      const x = image.x;
      const y = image.y;
      const w = image.width;
      const h = image.height;
      context.moveTo(x + r, y);
      context.lineTo(x + w - r, y);
      context.quadraticCurveTo(x + w, y, x + w, y + r);
      context.lineTo(x + w, y + h - r);
      context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      context.lineTo(x + r, y + h);
      context.quadraticCurveTo(x, y + h, x, y + h - r);
      context.lineTo(x, y + r);
      context.quadraticCurveTo(x, y, x + r, y);
      context.closePath();
    }
    context.clip();
  }

  context.drawImage(img, image.x, image.y, image.width, image.height);

  // Reset shadow before drawing border to avoid shadow on border
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  // Draw border if specified
  if (image.strokeWidth && image.strokeWidth > 0 && image.strokeColor) {
    context.strokeStyle = image.strokeColor;
    context.lineWidth = image.strokeWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (radius > 0) {
      // Draw rounded border
      context.beginPath();
      if (typeof context.roundRect === "function") {
        context.roundRect(image.x, image.y, image.width, image.height, radius);
      } else {
        const r = Math.min(radius, image.width / 2, image.height / 2);
        const x = image.x;
        const y = image.y;
        const w = image.width;
        const h = image.height;
        context.moveTo(x + r, y);
        context.lineTo(x + w - r, y);
        context.quadraticCurveTo(x + w, y, x + w, y + r);
        context.lineTo(x + w, y + h - r);
        context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        context.lineTo(x + r, y + h);
        context.quadraticCurveTo(x, y + h, x, y + h - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
      }
      context.stroke();
    } else {
      // Draw rectangular border
      context.strokeRect(image.x, image.y, image.width, image.height);
    }
  }

  context.restore();
}

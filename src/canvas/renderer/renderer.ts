import type {
  AlignmentGuide,
  ArrowElement,
  Bounds,
  CircleElement,
  FreehandStroke,
  RectangleElement,
  SelectionSet,
  Viewport,
  WhiteboardElement,
  CanvasSettings,
  LineElement,
  RoundedRectangleElement,
  ImageElement,
  CropState,
} from "@/types/canvas";
import { drawSelection } from "../interaction/selection";
import { drawTextElement } from "./text";
import { drawFreehandStroke } from "./freehand";
import { getOrLoadImage } from "./images";

export const STROKE_COLOR = "#0f172a";
export const STROKE_COLOR_DARK = "#e2e8f0";
export const STROKE_WIDTH = 3;
export const TEXT_FONT_SIZE = 20;

/**
 * Check if a color is dark by calculating its luminance.
 * Returns true if the color is considered dark (luminance < 128).
 */
function isDarkColor(color: string): boolean {
  // Remove # if present
  const hex = color.replace('#', '');

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance using the standard formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

  return luminance < 128;
}

export function drawAlignmentGuides(
  context: CanvasRenderingContext2D,
  guides: AlignmentGuide[],
  viewport: Viewport,
) {
  if (guides.length === 0) return;

  context.save();
  context.strokeStyle = "#06b6d4";
  context.lineWidth = 1.5 / viewport.scale;
  context.setLineDash([4 / viewport.scale, 4 / viewport.scale]);

  for (const guide of guides) {
    context.beginPath();
    if (guide.type === "vertical") {
      context.moveTo(guide.position, guide.start);
      context.lineTo(guide.position, guide.end);
    } else {
      context.moveTo(guide.start, guide.position);
      context.lineTo(guide.end, guide.position);
    }
    context.stroke();
  }

  context.restore();
}

export function renderCanvas(
  canvas: HTMLCanvasElement | null,
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  previewElement: WhiteboardElement | null,
  selection: SelectionSet | null,
  viewport: Viewport,
  settings: CanvasSettings,
  onImageLoaded?: () => void,
  guides: AlignmentGuide[] = [],
) {
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const bounds = canvas.getBoundingClientRect();
  const devicePixelRatio = window.devicePixelRatio || 1;
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.fillStyle = settings.backgroundColor;
  context.fillRect(0, 0, bounds.width, bounds.height);

  // Determine stroke color based on background (for demo elements without custom colors)
  // Use a brightness check to detect dark backgrounds more robustly
  const isDarkBackground = isDarkColor(settings.backgroundColor);
  const adaptiveStrokeColor = isDarkBackground ? STROKE_COLOR_DARK : STROKE_COLOR;

  context.save();
  context.translate(viewport.offsetX, viewport.offsetY);
  context.scale(viewport.scale, viewport.scale);

  if (settings.showGrid) {
    context.save();
    const left = -viewport.offsetX / viewport.scale;
    const top = -viewport.offsetY / viewport.scale;
    const right = (bounds.width - viewport.offsetX) / viewport.scale;
    const bottom = (bounds.height - viewport.offsetY) / viewport.scale;

    let activeGridSize = settings.gridSize;
    while (activeGridSize * viewport.scale < 8) {
      activeGridSize *= 2;
    }

    const startX = Math.floor(left / activeGridSize) * activeGridSize;
    const startY = Math.floor(top / activeGridSize) * activeGridSize;

    context.fillStyle = "#cbd5e1";
    context.beginPath();
    for (let x = startX; x < right; x += activeGridSize) {
      for (let y = startY; y < bottom; y += activeGridSize) {
        context.moveTo(x, y);
        context.arc(x, y, 1.5 / viewport.scale, 0, Math.PI * 2);
      }
    }
    context.fill();
    context.restore();
  }

  for (const stroke of strokes) {
    drawStroke(context, stroke, adaptiveStrokeColor);
  }

  for (const element of elements) {
    if (element.type === "rectangle") {
      drawRectangle(context, element, adaptiveStrokeColor);
    } else if (element.type === "roundedRectangle") {
      drawRoundedRectangle(context, element, adaptiveStrokeColor);
    } else if (element.type === "circle") {
      drawCircle(context, element, adaptiveStrokeColor);
    } else if (element.type === "arrow") {
      drawArrow(context, element, adaptiveStrokeColor);
    } else if (element.type === "line") {
      drawLine(context, element, adaptiveStrokeColor);
    } else if (element.type === "image") {
      drawImageElement(context, element, onImageLoaded ?? (() => {}));
    } else {
      drawTextElement(context, element);
    }
  }

  if (previewElement) {
    if (previewElement.type === "rectangle") {
      drawRectangle(context, previewElement, adaptiveStrokeColor);
    } else if (previewElement.type === "roundedRectangle") {
      drawRoundedRectangle(context, previewElement, adaptiveStrokeColor);
    } else if (previewElement.type === "circle") {
      drawCircle(context, previewElement, adaptiveStrokeColor);
    } else if (previewElement.type === "arrow") {
      drawArrow(context, previewElement, adaptiveStrokeColor);
    } else if (previewElement.type === "line") {
      drawLine(context, previewElement, adaptiveStrokeColor);
    } else if (previewElement.type === "image") {
      drawImageElement(context, previewElement, () => {});
    } else if (previewElement.type === "text") {
      drawTextElement(context, previewElement);
    }
  }

  if (guides.length > 0) {
    drawAlignmentGuides(context, guides, viewport);
  }

  if (selection) {
    drawSelection(context, selection, elements);
  }

  context.restore();
}

export function drawStroke(context: CanvasRenderingContext2D, stroke: FreehandStroke, strokeColor?: string) {
  drawFreehandStroke(context, stroke, strokeColor || STROKE_COLOR, STROKE_WIDTH);
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

export function drawRectangle(
  context: CanvasRenderingContext2D,
  rectangle: RectangleElement,
  adaptiveStrokeColor?: string,
) {
  context.save();
  if (rectangle.rotation) {
    const cx = rectangle.x + rectangle.width / 2;
    const cy = rectangle.y + rectangle.height / 2;
    context.translate(cx, cy);
    context.rotate(rectangle.rotation);
    context.translate(-cx, -cy);
  }
  // Use adaptive color if element has default stroke color
  context.strokeStyle = (rectangle.strokeColor === STROKE_COLOR && adaptiveStrokeColor) ? adaptiveStrokeColor : rectangle.strokeColor;
  context.lineWidth = rectangle.strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (rectangle.fillColor && rectangle.fillColor !== "transparent" && rectangle.fillColor !== "none") {
    context.fillStyle = rectangle.fillColor;
    context.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
  }

  context.strokeRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
  context.restore();
}

export function drawCircle(context: CanvasRenderingContext2D, circle: CircleElement, adaptiveStrokeColor?: string) {
  context.save();
  if (circle.rotation) {
    const cx = circle.x + circle.width / 2;
    const cy = circle.y + circle.height / 2;
    context.translate(cx, cy);
    context.rotate(circle.rotation);
    context.translate(-cx, -cy);
  }
  // Use adaptive color if element has default stroke color
  context.strokeStyle = (circle.strokeColor === STROKE_COLOR && adaptiveStrokeColor) ? adaptiveStrokeColor : circle.strokeColor;
  context.lineWidth = circle.strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.ellipse(
    circle.x + circle.width / 2,
    circle.y + circle.height / 2,
    circle.width / 2,
    circle.height / 2,
    0,
    0,
    Math.PI * 2,
  );

  if (circle.fillColor && circle.fillColor !== "transparent" && circle.fillColor !== "none") {
    context.fillStyle = circle.fillColor;
    context.fill();
  }
  
  context.stroke();
  context.restore();
}

export function drawArrow(context: CanvasRenderingContext2D, arrow: ArrowElement, adaptiveStrokeColor?: string) {
  context.save();
  if (arrow.rotation) {
    const cx = (arrow.startX + arrow.endX) / 2;
    const cy = (arrow.startY + arrow.endY) / 2;
    context.translate(cx, cy);
    context.rotate(arrow.rotation);
    context.translate(-cx, -cy);
  }
  const angle = Math.atan2(arrow.endY - arrow.startY, arrow.endX - arrow.startX);
  const arrowheadLength = 12;
  const arrowheadAngle = Math.PI / 7;

  // Use adaptive color if element has default stroke color
  context.strokeStyle = (arrow.strokeColor === STROKE_COLOR && adaptiveStrokeColor) ? adaptiveStrokeColor : arrow.strokeColor;
  context.lineWidth = arrow.strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(arrow.startX, arrow.startY);
  context.lineTo(arrow.endX, arrow.endY);
  context.moveTo(
    arrow.endX - arrowheadLength * Math.cos(angle - arrowheadAngle),
    arrow.endY - arrowheadLength * Math.sin(angle - arrowheadAngle),
  );
  context.lineTo(arrow.endX, arrow.endY);
  context.lineTo(
    arrow.endX - arrowheadLength * Math.cos(angle + arrowheadAngle),
    arrow.endY - arrowheadLength * Math.sin(angle + arrowheadAngle),
  );
  context.stroke();
  context.restore();
}

export function drawLine(context: CanvasRenderingContext2D, line: LineElement, adaptiveStrokeColor?: string) {
  context.save();
  if (line.rotation) {
    const cx = (line.startX + line.endX) / 2;
    const cy = (line.startY + line.endY) / 2;
    context.translate(cx, cy);
    context.rotate(line.rotation);
    context.translate(-cx, -cy);
  }

  // Use adaptive color if element has default stroke color
  context.strokeStyle = (line.strokeColor === STROKE_COLOR && adaptiveStrokeColor) ? adaptiveStrokeColor : line.strokeColor;
  context.lineWidth = line.strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(line.startX, line.startY);
  context.lineTo(line.endX, line.endY);
  context.stroke();
  context.restore();
}

export function drawRoundedRectangle(
  context: CanvasRenderingContext2D,
  rectangle: RoundedRectangleElement,
  adaptiveStrokeColor?: string,
) {
  context.save();
  if (rectangle.rotation) {
    const cx = rectangle.x + rectangle.width / 2;
    const cy = rectangle.y + rectangle.height / 2;
    context.translate(cx, cy);
    context.rotate(rectangle.rotation);
    context.translate(-cx, -cy);
  }
  // Use adaptive color if element has default stroke color
  context.strokeStyle = (rectangle.strokeColor === STROKE_COLOR && adaptiveStrokeColor) ? adaptiveStrokeColor : rectangle.strokeColor;
  context.lineWidth = rectangle.strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";

  context.beginPath();
  if (typeof context.roundRect === "function") {
    context.roundRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height, rectangle.radius);
  } else {
    // fallback
    const r = rectangle.radius;
    const x = rectangle.x;
    const y = rectangle.y;
    const w = rectangle.width;
    const h = rectangle.height;
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

  if (rectangle.fillColor && rectangle.fillColor !== "transparent" && rectangle.fillColor !== "none") {
    context.fillStyle = rectangle.fillColor;
    context.fill();
  }

  context.stroke();
  context.restore();
}

/**
 * Draw the transient marquee selection rectangle on top of the already-rendered
 * canvas content.
 *
 * Must be called AFTER `renderCanvas` because it draws in the same canvas
 * context. `renderCanvas` leaves the context with only the devicePixelRatio
 * scale active; this function re-applies the viewport translate + scale so the
 * marquee rect is expressed in logical (canvas) coordinates and correctly
 * follows pan/zoom.
 *
 * @param canvas        The same HTMLCanvasElement used by `renderCanvas`.
 * @param marqueeBounds Normalized marquee rectangle in logical coordinates.
 * @param viewport      Current viewport (offsetX, offsetY, scale).
 */
export function renderMarquee(
  canvas: HTMLCanvasElement | null,
  marqueeBounds: Bounds,
  viewport: Viewport,
): void {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  const x = marqueeBounds.left;
  const y = marqueeBounds.top;
  const w = marqueeBounds.right - marqueeBounds.left;
  const h = marqueeBounds.bottom - marqueeBounds.top;

  // Re-apply the viewport transform on top of the devicePixelRatio scale that
  // renderCanvas already set. This keeps the marquee in logical space.
  context.save();
  context.translate(viewport.offsetX, viewport.offsetY);
  context.scale(viewport.scale, viewport.scale);

  // Translucent teal fill — same accent colour as selection handles.
  context.fillStyle = "rgba(13, 148, 136, 0.06)";
  context.fillRect(x, y, w, h);

  // Dashed border. Scale the line-width and dash sizes inverse to zoom so they
  // always appear at ~1.5 px regardless of the current zoom level.
  const invScale = 1 / viewport.scale;
  context.strokeStyle = "#0d9488";
  context.lineWidth = 1.5 * invScale;
  context.setLineDash([5 * invScale, 4 * invScale]);
  context.strokeRect(x, y, w, h);

  context.setLineDash([]);
  context.restore();
}

export function renderCropOverlay(
  context: CanvasRenderingContext2D,
  cropState: CropState,
  viewport: Viewport,
): void {
  const el = cropState.element;
  context.save();
  context.translate(viewport.offsetX, viewport.offsetY);
  context.scale(viewport.scale, viewport.scale);

  if (el.rotation) {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    context.translate(cx, cy);
    context.rotate(el.rotation);
    context.translate(-cx, -cy);
  }

  // Dim the outside of the crop area
  context.fillStyle = "rgba(0, 0, 0, 0.4)";
  context.beginPath();
  context.rect(el.x, el.y, el.width, el.height);
  const cx = el.x + cropState.left;
  const cy = el.y + cropState.top;
  const cw = cropState.right - cropState.left;
  const ch = cropState.bottom - cropState.top;
  context.rect(cx + cw, cy, -cw, ch);
  context.fill("evenodd");

  // Draw crop border
  context.strokeStyle = "#fff";
  context.lineWidth = 1.5 / viewport.scale;
  context.strokeRect(cx, cy, cw, ch);
  context.strokeStyle = "#0ea5e9"; // teal / sky
  context.setLineDash([5 / viewport.scale, 5 / viewport.scale]);
  context.strokeRect(cx, cy, cw, ch);
  context.setLineDash([]);

  // Draw handles
  const handleSize = 8 / viewport.scale;
  context.fillStyle = "#fff";
  context.strokeStyle = "#0ea5e9";
  context.lineWidth = 1.5 / viewport.scale;

  const drawHandle = (x: number, y: number) => {
    context.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    context.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
  };

  drawHandle(cx, cy); // top-left
  drawHandle(cx + cw, cy); // top-right
  drawHandle(cx, cy + ch); // bottom-left
  drawHandle(cx + cw, cy + ch); // bottom-right

  context.restore();
}

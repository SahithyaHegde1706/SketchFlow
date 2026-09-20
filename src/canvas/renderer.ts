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
import { drawSelection } from "./selection";
import { drawTextElement } from "./text";
import { drawFreehandStroke } from "./freehand";
import { getOrLoadImage } from "./images";

export const STROKE_COLOR = "#0f172a";
export const STROKE_WIDTH = 3;
export const TEXT_FONT_SIZE = 20;

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
    drawStroke(context, stroke);
  }

  for (const element of elements) {
    if (element.type === "rectangle") {
      drawRectangle(context, element);
    } else if (element.type === "roundedRectangle") {
      drawRoundedRectangle(context, element);
    } else if (element.type === "circle") {
      drawCircle(context, element);
    } else if (element.type === "arrow") {
      drawArrow(context, element);
    } else if (element.type === "line") {
      drawLine(context, element);
    } else if (element.type === "image") {
      drawImageElement(context, element, () => {
        // We need a way to trigger redraw, but we don't have it easily here without a callback.
        // In a real implementation we'd trigger a re-render from the store when the image loads.
      });
    } else {
      drawTextElement(context, element);
    }
  }

  if (previewElement) {
    if (previewElement.type === "rectangle") {
      drawRectangle(context, previewElement);
    } else if (previewElement.type === "roundedRectangle") {
      drawRoundedRectangle(context, previewElement);
    } else if (previewElement.type === "circle") {
      drawCircle(context, previewElement);
    } else if (previewElement.type === "arrow") {
      drawArrow(context, previewElement);
    } else if (previewElement.type === "line") {
      drawLine(context, previewElement);
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

export function drawStroke(context: CanvasRenderingContext2D, stroke: FreehandStroke) {
  drawFreehandStroke(context, stroke, STROKE_COLOR, STROKE_WIDTH);
}

export function drawImageElement(
  context: CanvasRenderingContext2D,
  image: ImageElement,
  onLoaded: () => void
) {
  const img = getOrLoadImage(image.src, onLoaded);
  if (!img) return; // not loaded yet

  context.save();
  if (image.rotation) {
    const cx = image.x + image.width / 2;
    const cy = image.y + image.height / 2;
    context.translate(cx, cy);
    context.rotate(image.rotation);
    context.translate(-cx, -cy);
  }
  
  context.drawImage(img, image.x, image.y, image.width, image.height);
  
  context.restore();
}

export function drawRectangle(
  context: CanvasRenderingContext2D,
  rectangle: RectangleElement,
) {
  context.save();
  if (rectangle.rotation) {
    const cx = rectangle.x + rectangle.width / 2;
    const cy = rectangle.y + rectangle.height / 2;
    context.translate(cx, cy);
    context.rotate(rectangle.rotation);
    context.translate(-cx, -cy);
  }
  context.strokeStyle = rectangle.strokeColor;
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

export function drawCircle(context: CanvasRenderingContext2D, circle: CircleElement) {
  context.save();
  if (circle.rotation) {
    const cx = circle.x + circle.width / 2;
    const cy = circle.y + circle.height / 2;
    context.translate(cx, cy);
    context.rotate(circle.rotation);
    context.translate(-cx, -cy);
  }
  context.strokeStyle = circle.strokeColor;
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

export function drawArrow(context: CanvasRenderingContext2D, arrow: ArrowElement) {
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

  context.strokeStyle = arrow.strokeColor;
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

export function drawLine(context: CanvasRenderingContext2D, line: LineElement) {
  context.save();
  if (line.rotation) {
    const cx = (line.startX + line.endX) / 2;
    const cy = (line.startY + line.endY) / 2;
    context.translate(cx, cy);
    context.rotate(line.rotation);
    context.translate(-cx, -cy);
  }
  
  context.strokeStyle = line.strokeColor;
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
) {
  context.save();
  if (rectangle.rotation) {
    const cx = rectangle.x + rectangle.width / 2;
    const cy = rectangle.y + rectangle.height / 2;
    context.translate(cx, cy);
    context.rotate(rectangle.rotation);
    context.translate(-cx, -cy);
  }
  context.strokeStyle = rectangle.strokeColor;
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

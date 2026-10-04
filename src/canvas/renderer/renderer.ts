import type { AlignmentGuide, Viewport } from "@/types/geometry";
import type { FreehandStroke, WhiteboardElement, CanvasSettings } from "@/types/canvas";
import type { SelectionSet } from "@/types/editor";
import { drawSelection } from "../interaction/selection";
import { drawTextElement } from "./text";
import { drawFreehandStroke } from "./freehand";
import { drawImageElement } from "./images";
import {
  drawArrow,
  drawCircle,
  drawLine,
  drawRectangle,
  drawRoundedRectangle,
} from "./shapes";
import { renderGrid } from "./grid";
import { drawAlignmentGuides } from "./overlays";
import {
  getAdaptiveStrokeColor,
  STROKE_COLOR,
  STROKE_WIDTH,
} from "./styles";

export {
  drawArrow,
  drawCircle,
  drawLine,
  drawRectangle,
  drawRoundedRectangle,
} from "./shapes";
export {
  drawAlignmentGuides,
  renderCropOverlay,
  renderMarquee,
} from "./overlays";
export { drawImageElement } from "./images";
export {
  STROKE_COLOR,
  STROKE_COLOR_DARK,
  STROKE_WIDTH,
  TEXT_FONT_SIZE,
} from "./styles";

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

  const adaptiveStrokeColor = getAdaptiveStrokeColor(settings.backgroundColor);

  context.save();
  context.translate(viewport.offsetX, viewport.offsetY);
  context.scale(viewport.scale, viewport.scale);

  renderGrid(context, bounds, viewport, settings);

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

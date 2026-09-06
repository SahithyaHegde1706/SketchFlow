import type {
  ArrowElement,
  CircleElement,
  FreehandStroke,
  RectangleElement,
  SelectionSet,
  Viewport,
  WhiteboardElement,
  CanvasSettings,
  LineElement,
  RoundedRectangleElement,
} from "@/types/canvas";
import { drawSelection } from "./selection";
import { drawTextElement } from "./text";

export const STROKE_COLOR = "#0f172a";
export const STROKE_WIDTH = 3;
export const TEXT_FONT_SIZE = 20;

export function renderCanvas(
  canvas: HTMLCanvasElement | null,
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  previewElement: WhiteboardElement | null,
  selection: SelectionSet | null,
  viewport: Viewport,
  settings: CanvasSettings,
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
    } else if (previewElement.type === "text") {
      drawTextElement(context, previewElement);
    }
  }

  if (selection) {
    drawSelection(context, selection, elements);
  }

  context.restore();
}

export function drawStroke(context: CanvasRenderingContext2D, stroke: FreehandStroke) {
  const firstPoint = stroke[0];

  if (!firstPoint) {
    return;
  }

  context.strokeStyle = STROKE_COLOR;
  context.lineWidth = STROKE_WIDTH;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(firstPoint.x, firstPoint.y);

  for (const point of stroke.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.stroke();
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

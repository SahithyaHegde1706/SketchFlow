import type {
  ArrowElement,
  CircleElement,
  FreehandStroke,
  RectangleElement,
  Selection,
  TextElement,
  Viewport,
  WhiteboardElement,
} from "@/types/canvas";
import { drawSelection } from "./selection";

export const STROKE_COLOR = "#0f172a";
export const STROKE_WIDTH = 3;
export const TEXT_FONT_SIZE = 20;

export function renderCanvas(
  canvas: HTMLCanvasElement | null,
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  rectanglePreview: RectangleElement | null,
  circlePreview: CircleElement | null,
  arrowPreview: ArrowElement | null,
  selection: Selection | null,
  viewport: Viewport,
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
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, bounds.width, bounds.height);

  context.save();
  context.translate(viewport.offsetX, viewport.offsetY);

  for (const stroke of strokes) {
    drawStroke(context, stroke);
  }

  for (const element of elements) {
    if (element.type === "rectangle") {
      drawRectangle(context, element);
    } else if (element.type === "circle") {
      drawCircle(context, element);
    } else if (element.type === "arrow") {
      drawArrow(context, element);
    } else {
      drawText(context, element);
    }
  }

  if (rectanglePreview) {
    drawRectangle(context, rectanglePreview);
  }

  if (circlePreview) {
    drawCircle(context, circlePreview);
  }

  if (arrowPreview) {
    drawArrow(context, arrowPreview);
  }

  if (selection) {
    drawSelection(context, selection);
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
  context.strokeStyle = rectangle.strokeColor;
  context.lineWidth = rectangle.strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
}

export function drawCircle(context: CanvasRenderingContext2D, circle: CircleElement) {
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
  context.stroke();
}

export function drawArrow(context: CanvasRenderingContext2D, arrow: ArrowElement) {
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
}

export function drawText(context: CanvasRenderingContext2D, text: TextElement) {
  context.fillStyle = text.strokeColor;
  context.font = `${text.fontSize}px Arial, sans-serif`;
  context.textBaseline = "alphabetic";
  context.fillText(text.text, text.x, text.y);
}

import type {
  ArrowElement,
  CircleElement,
  LineElement,
  RectangleElement,
  RoundedRectangleElement,
} from "@/types/canvas";
import { STROKE_COLOR } from "./styles";

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

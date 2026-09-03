"use client";

import type { PointerEvent } from "react";
import { useEffect, useRef } from "react";
import type {
  FreehandStroke,
  Point,
  RectangleElement,
  Tool,
  WhiteboardElement,
} from "@/components/whiteboard/types";

const STROKE_COLOR = "#0f172a";
const STROKE_WIDTH = 3;

type BoardCanvasProps = {
  activeTool: Tool;
};

export function BoardCanvas({ activeTool }: BoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<FreehandStroke[]>([]);
  const elementsRef = useRef<WhiteboardElement[]>([]);
  const activeStrokeRef = useRef<FreehandStroke | null>(null);
  const activeRectangleRef = useRef<RectangleElement | null>(null);
  const activeRectangleStartRef = useRef<Point | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeToolRef = useRef(activeTool);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const context = canvas.getContext("2d");

      if (!context || bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(bounds.width * devicePixelRatio);
      canvas.height = Math.round(bounds.height * devicePixelRatio);
      renderCanvas(canvas, strokesRef.current, elementsRef.current, activeRectangleRef.current);
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const getPoint = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    const point = getPoint(event);
    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (activeToolRef.current === "rectangle") {
      activeRectangleStartRef.current = point;
      activeRectangleRef.current = createRectangle(point, point);
    } else {
      const stroke = [point];
      activeStrokeRef.current = stroke;
      strokesRef.current.push(stroke);
    }

    renderCanvas(canvasRef.current, strokesRef.current, elementsRef.current, activeRectangleRef.current);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const point = getPoint(event);

    if (activeToolRef.current === "rectangle") {
      const rectangle = activeRectangleRef.current;
      const start = activeRectangleStartRef.current;

      if (rectangle && start) {
        activeRectangleRef.current = createRectangle(start, point);
      }
    } else {
      const stroke = activeStrokeRef.current;

      if (stroke) {
        stroke.push(point);
      }
    }

    renderCanvas(canvasRef.current, strokesRef.current, elementsRef.current, activeRectangleRef.current);
  };

  const stopDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (activeToolRef.current === "rectangle") {
      const rectangle = activeRectangleRef.current;

      if (rectangle && rectangle.width > 0 && rectangle.height > 0) {
        elementsRef.current.push(rectangle);
      }
      activeRectangleRef.current = null;
      activeRectangleStartRef.current = null;
    } else {
      activeStrokeRef.current = null;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activePointerIdRef.current = null;
    renderCanvas(canvasRef.current, strokesRef.current, elementsRef.current, null);
  };

  return (
    <section
      aria-label="Whiteboard canvas"
      className="board-canvas relative min-h-0 flex-1 overflow-hidden bg-[#f8fafc]"
    >
      <canvas
        ref={canvasRef}
        aria-label="SketchFlow drawing surface"
        className="absolute inset-0 size-full bg-white/80"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        onPointerLeave={stopDrawing}
      />
    </section>
  );
}

function createRectangle(start: Point, end: Point): RectangleElement {
  return {
    id: crypto.randomUUID(),
    type: "rectangle",
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
    strokeColor: STROKE_COLOR,
    strokeWidth: STROKE_WIDTH,
  };
}

function renderCanvas(
  canvas: HTMLCanvasElement | null,
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  preview: RectangleElement | null,
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

  for (const stroke of strokes) {
    drawStroke(context, stroke);
  }

  for (const element of elements) {
    drawRectangle(context, element);
  }

  if (preview) {
    drawRectangle(context, preview);
  }
}

function drawStroke(context: CanvasRenderingContext2D, stroke: FreehandStroke) {
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

function drawRectangle(context: CanvasRenderingContext2D, rectangle: RectangleElement) {
  context.strokeStyle = rectangle.strokeColor;
  context.lineWidth = rectangle.strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
}

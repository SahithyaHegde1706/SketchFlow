"use client";

import { useEffect, useRef } from "react";

type Point = {
  x: number;
  y: number;
};

type Stroke = Point[];

const STROKE_COLOR = "#0f172a";
const STROKE_WIDTH = 3;

export function BoardCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const devicePixelRatio = window.devicePixelRatio || 1;
      const context = canvas.getContext("2d");

      if (!context || bounds.width === 0 || bounds.height === 0) {
        return;
      }

      canvas.width = Math.round(bounds.width * devicePixelRatio);
      canvas.height = Math.round(bounds.height * devicePixelRatio);
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, bounds.width, bounds.height);
      context.strokeStyle = STROKE_COLOR;
      context.lineWidth = STROKE_WIDTH;
      context.lineCap = "round";
      context.lineJoin = "round";

      for (const stroke of strokesRef.current) {
        drawStroke(context, stroke);
      }
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

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  const drawSegment = (from: Point, to: Point) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    context.strokeStyle = STROKE_COLOR;
    context.lineWidth = STROKE_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    const point = getPoint(event);
    const stroke = [point];
    activeStrokeRef.current = stroke;
    activePointerIdRef.current = event.pointerId;
    strokesRef.current.push(stroke);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const stroke = activeStrokeRef.current;
    const previousPoint = stroke?.at(-1);
    const point = getPoint(event);

    if (!stroke || !previousPoint) {
      return;
    }

    stroke.push(point);
    drawSegment(previousPoint, point);
  };

  const stopDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
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

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  const firstPoint = stroke[0];

  if (!firstPoint) {
    return;
  }

  context.beginPath();
  context.moveTo(firstPoint.x, firstPoint.y);

  for (const point of stroke.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.stroke();
}

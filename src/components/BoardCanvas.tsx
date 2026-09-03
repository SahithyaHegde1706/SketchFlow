"use client";

import type { ChangeEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type {
  FreehandStroke,
  ArrowElement,
  CircleElement,
  Point,
  RectangleElement,
  Selection,
  TextElement,
  Tool,
  WhiteboardElement,
} from "@/components/whiteboard/types";

const STROKE_COLOR = "#0f172a";
const STROKE_WIDTH = 3;
const TEXT_FONT_SIZE = 20;
const ERASER_TOLERANCE = 8;

type BoardCanvasProps = {
  activeTool: Tool;
};

type TextEditorState = {
  x: number;
  y: number;
  value: string;
};

type CreationRecord =
  | { kind: "stroke"; value: FreehandStroke }
  | { kind: "element"; value: WhiteboardElement };

type ResizeHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type DragState = {
  selection: Selection;
  pointerStart: Point;
  original: FreehandStroke | WhiteboardElement;
  type: "move" | "resize";
  handle?: ResizeHandle;
};

export function BoardCanvas({ activeTool }: BoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<FreehandStroke[]>([]);
  const elementsRef = useRef<WhiteboardElement[]>([]);
  const creationOrderRef = useRef<CreationRecord[]>([]);
  const selectionRef = useRef<Selection | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const activeStrokeRef = useRef<FreehandStroke | null>(null);
  const activeRectangleRef = useRef<RectangleElement | null>(null);
  const activeRectangleStartRef = useRef<Point | null>(null);
  const activeCircleRef = useRef<CircleElement | null>(null);
  const activeCircleStartRef = useRef<Point | null>(null);
  const activeArrowRef = useRef<ArrowElement | null>(null);
  const activeArrowStartRef = useRef<Point | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const textEditorRef = useRef<TextEditorState | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

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
      renderCanvas(
        canvas,
        strokesRef.current,
        elementsRef.current,
        activeRectangleRef.current,
        activeCircleRef.current,
        activeArrowRef.current,
        selectionRef.current,
      );
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

  const getPoint = (
    event: PointerEvent<HTMLCanvasElement> | MouseEvent<HTMLCanvasElement>,
  ): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  useEffect(() => {
    if (textEditor) {
      textInputRef.current?.focus();
    }
  }, [textEditor]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    if (activeTool === "text") {
      return;
    }

    const point = getPoint(event);

    if (activeTool === "select") {
      const currentSelection = selectionRef.current;
      const context = canvasRef.current?.getContext("2d");

      let clickedHandle: ResizeHandle | null = null;
      if (currentSelection && context) {
        clickedHandle = findResizeHandleAtPoint(context, point, currentSelection);
      }

      if (clickedHandle && currentSelection) {
        dragRef.current = {
          selection: currentSelection,
          pointerStart: point,
          original: cloneSelectionValue(currentSelection),
          type: "resize",
          handle: clickedHandle,
        };
        activePointerIdRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
      } else {
        const nextSelection = findSelectionAtPoint(point, true);
        selectionRef.current = nextSelection;

        if (nextSelection) {
          dragRef.current = {
            selection: nextSelection,
            pointerStart: point,
            original: cloneSelectionValue(nextSelection),
            type: "move",
          };
          activePointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
        } else {
          dragRef.current = null;
        }
      }

      renderCanvas(
        canvasRef.current,
        strokesRef.current,
        elementsRef.current,
        null,
        null,
        null,
        selectionRef.current,
      );
      return;
    }

    selectionRef.current = null;

    if (activeTool === "eraser") {
      eraseAtPoint(point);
      return;
    }

    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (activeTool === "rectangle") {
      activeRectangleStartRef.current = point;
      activeRectangleRef.current = createRectangle(point, point);
    } else if (activeTool === "circle") {
      activeCircleStartRef.current = point;
      activeCircleRef.current = createCircle(point, point);
    } else if (activeTool === "arrow") {
      activeArrowStartRef.current = point;
      activeArrowRef.current = createArrow(point, point);
    } else {
      const stroke = [point];
      activeStrokeRef.current = stroke;
      strokesRef.current.push(stroke);
      creationOrderRef.current.push({ kind: "stroke", value: stroke });
    }

    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      activeRectangleRef.current,
      activeCircleRef.current,
      activeArrowRef.current,
      selectionRef.current,
    );
  };

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "text") {
      return;
    }

    const point = getPoint(event);
    const editor = { x: point.x, y: point.y, value: "" };
    textEditorRef.current = editor;
    setTextEditor(editor);
  };

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const editor = textEditorRef.current;

    if (!editor) {
      return;
    }

    const nextEditor = { ...editor, value: event.target.value };
    textEditorRef.current = nextEditor;
    setTextEditor(nextEditor);
  };

  const cancelText = () => {
    textEditorRef.current = null;
    setTextEditor(null);
  };

  const commitText = () => {
    const editor = textEditorRef.current;

    if (!editor) {
      return;
    }

    textEditorRef.current = null;
    setTextEditor(null);

    if (editor.value.trim().length === 0) {
      return;
    }

    const textElement: TextElement = {
      id: crypto.randomUUID(),
      type: "text",
      x: editor.x,
      y: editor.y,
      text: editor.value,
      fontSize: TEXT_FONT_SIZE,
      strokeColor: STROKE_COLOR,
    };
    elementsRef.current.push(textElement);
    creationOrderRef.current.push({ kind: "element", value: textElement });
    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      null,
      null,
      null,
      selectionRef.current,
    );
  };

  const handleTextKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitText();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelText();
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = getPoint(event);

    if (activePointerIdRef.current !== event.pointerId) {
      if (activeTool === "select") {
        const currentSelection = selectionRef.current;
        const context = canvasRef.current?.getContext("2d");
        if (currentSelection && context) {
          const hoveredHandle = findResizeHandleAtPoint(context, point, currentSelection);
          if (hoveredHandle === "top-left" || hoveredHandle === "bottom-right") {
            event.currentTarget.style.cursor = "nwse-resize";
          } else if (hoveredHandle === "top-right" || hoveredHandle === "bottom-left") {
            event.currentTarget.style.cursor = "nesw-resize";
          } else if (findSelectionAtPoint(point, true)) {
            event.currentTarget.style.cursor = "move";
          } else {
            event.currentTarget.style.cursor = "default";
          }
        } else {
          event.currentTarget.style.cursor = "default";
        }
      } else {
        event.currentTarget.style.cursor = "";
      }
      return;
    }

    if (activeTool === "select") {
      const drag = dragRef.current;

      if (drag) {
        if (drag.type === "resize" && drag.handle) {
          resizeSelection(
            drag.selection,
            drag.original,
            point.x - drag.pointerStart.x,
            point.y - drag.pointerStart.y,
            drag.handle,
            canvasRef.current?.getContext("2d") ?? undefined,
          );
        } else {
          moveSelection(drag.selection, drag.original, point.x - drag.pointerStart.x, point.y - drag.pointerStart.y);
        }
        renderCanvas(
          canvasRef.current,
          strokesRef.current,
          elementsRef.current,
          null,
          null,
          null,
          selectionRef.current,
        );
      }
      return;
    }

    if (activeTool === "rectangle") {
      const rectangle = activeRectangleRef.current;
      const start = activeRectangleStartRef.current;

      if (rectangle && start) {
        activeRectangleRef.current = createRectangle(start, point);
      }
    } else if (activeTool === "circle") {
      const circle = activeCircleRef.current;
      const start = activeCircleStartRef.current;

      if (circle && start) {
        activeCircleRef.current = createCircle(start, point);
      }
    } else if (activeTool === "arrow") {
      const arrow = activeArrowRef.current;
      const start = activeArrowStartRef.current;

      if (arrow && start) {
        activeArrowRef.current = createArrow(start, point);
      }
    } else {
      const stroke = activeStrokeRef.current;

      if (stroke) {
        stroke.push(point);
      }
    }

    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      activeRectangleRef.current,
      activeCircleRef.current,
      activeArrowRef.current,
      selectionRef.current,
    );
  };

  const stopDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (activeTool === "rectangle") {
      const rectangle = activeRectangleRef.current;

      if (rectangle && rectangle.width > 0 && rectangle.height > 0) {
        elementsRef.current.push(rectangle);
        creationOrderRef.current.push({ kind: "element", value: rectangle });
      }
      activeRectangleRef.current = null;
      activeRectangleStartRef.current = null;
    } else if (activeTool === "circle") {
      const circle = activeCircleRef.current;

      if (circle && circle.width > 0 && circle.height > 0) {
        elementsRef.current.push(circle);
        creationOrderRef.current.push({ kind: "element", value: circle });
      }
      activeCircleRef.current = null;
      activeCircleStartRef.current = null;
      } else if (activeTool === "arrow") {
        const arrow = activeArrowRef.current;

        if (arrow && (arrow.startX !== arrow.endX || arrow.startY !== arrow.endY)) {
          elementsRef.current.push(arrow);
          creationOrderRef.current.push({ kind: "element", value: arrow });
        }
        activeArrowRef.current = null;
        activeArrowStartRef.current = null;
    } else {
      activeStrokeRef.current = null;
    }

    if (activeTool === "select") {
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      activePointerIdRef.current = null;
      renderCanvas(
        canvasRef.current,
        strokesRef.current,
        elementsRef.current,
        null,
        null,
        null,
        selectionRef.current,
      );
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activePointerIdRef.current = null;
    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      null,
      null,
      null,
      selectionRef.current,
    );
  };

  const handlePointerLeave = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== "select") {
      stopDrawing(event);
    }
  };

  const findSelectionAtPoint = (point: Point, useBounds = false): Selection | null => {
    const context = canvasRef.current?.getContext("2d");

    if (!context) {
      return null;
    }

    for (let index = creationOrderRef.current.length - 1; index >= 0; index -= 1) {
      const record = creationOrderRef.current[index];

      if (!record) {
        continue;
      }

      let isHit = false;
      if (useBounds) {
        const bounds = getSelectionBounds(context, record);
        const hitPadding = 4;
        isHit = point.x >= bounds.left - hitPadding &&
                point.x <= bounds.right + hitPadding &&
                point.y >= bounds.top - hitPadding &&
                point.y <= bounds.bottom + hitPadding;
      } else {
        isHit = record.kind === "stroke"
          ? isPointOnStroke(point, record.value)
          : isPointOnElement(context, point, record.value);
      }

      if (isHit) {
        return record;
      }
    }

    return null;
  };

  const findResizeHandleAtPoint = (
    context: CanvasRenderingContext2D,
    point: Point,
    selection: Selection,
  ): ResizeHandle | null => {
    const bounds = getSelectionBounds(context, selection);
    const padding = 6;
    const handleHitSize = 16;
    const left = bounds.left - padding;
    const right = bounds.right + padding;
    const top = bounds.top - padding;
    const bottom = bounds.bottom + padding;

    const handles: { type: ResizeHandle; x: number; y: number }[] = [
      { type: "top-left", x: left, y: top },
      { type: "top-right", x: right, y: top },
      { type: "bottom-left", x: left, y: bottom },
      { type: "bottom-right", x: right, y: bottom },
    ];

    for (const handle of handles) {
      if (
        point.x >= handle.x - handleHitSize / 2 &&
        point.x <= handle.x + handleHitSize / 2 &&
        point.y >= handle.y - handleHitSize / 2 &&
        point.y <= handle.y + handleHitSize / 2
      ) {
        return handle.type;
      }
    }

    return null;
  };

  const eraseAtPoint = (point: Point) => {
    const context = canvasRef.current?.getContext("2d");

    if (!context) {
      return;
    }

    for (let index = creationOrderRef.current.length - 1; index >= 0; index -= 1) {
      const record = creationOrderRef.current[index];

      if (!record) {
        continue;
      }

      const isHit = record.kind === "stroke"
        ? isPointOnStroke(point, record.value)
        : isPointOnElement(context, point, record.value);

      if (!isHit) {
        continue;
      }

      if (record.kind === "stroke") {
        removeByReference(strokesRef.current, record.value);
      } else {
        removeByReference(elementsRef.current, record.value);
      }
      creationOrderRef.current.splice(index, 1);
      renderCanvas(
        canvasRef.current,
        strokesRef.current,
        elementsRef.current,
        null,
        null,
        null,
        selectionRef.current,
      );
      return;
    }
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
        onClick={handleCanvasClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        onPointerLeave={handlePointerLeave}
      />
      {textEditor && (
        <input
          ref={textInputRef}
          type="text"
          value={textEditor.value}
          aria-label="Enter text"
          autoComplete="off"
          onChange={handleTextChange}
          onKeyDown={handleTextKeyDown}
          onBlur={commitText}
          className="absolute z-20 rounded-lg border border-teal-300 bg-white/95 px-2 py-1 text-base text-slate-900 shadow-sm outline-none ring-2 ring-teal-100 placeholder:text-slate-400"
          placeholder="Type here"
          style={{
            left: textEditor.x,
            top: Math.max(4, textEditor.y - TEXT_FONT_SIZE),
            width: 200,
          }}
        />
      )}
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

function createCircle(start: Point, end: Point): CircleElement {
  return {
    id: crypto.randomUUID(),
    type: "circle",
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
    strokeColor: STROKE_COLOR,
    strokeWidth: STROKE_WIDTH,
  };
}

function createArrow(start: Point, end: Point): ArrowElement {
  return {
    id: crypto.randomUUID(),
    type: "arrow",
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
    strokeColor: STROKE_COLOR,
    strokeWidth: STROKE_WIDTH,
  };
}

function renderCanvas(
  canvas: HTMLCanvasElement | null,
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  rectanglePreview: RectangleElement | null,
  circlePreview: CircleElement | null,
  arrowPreview: ArrowElement | null,
  selection: Selection | null,
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

function drawCircle(context: CanvasRenderingContext2D, circle: CircleElement) {
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

function drawArrow(context: CanvasRenderingContext2D, arrow: ArrowElement) {
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

function drawText(context: CanvasRenderingContext2D, text: TextElement) {
  context.fillStyle = text.strokeColor;
  context.font = `${text.fontSize}px Arial, sans-serif`;
  context.textBaseline = "alphabetic";
  context.fillText(text.text, text.x, text.y);
}

function isSameSelection(first: Selection | null, second: Selection | null) {
  return first?.kind === second?.kind && first?.value === second?.value;
}

function cloneSelectionValue(selection: Selection): FreehandStroke | WhiteboardElement {
  return selection.kind === "stroke"
    ? selection.value.map((point) => ({ ...point }))
    : { ...selection.value };
}

function moveSelection(
  selection: Selection,
  original: FreehandStroke | WhiteboardElement,
  deltaX: number,
  deltaY: number,
) {
  if (selection.kind === "stroke" && Array.isArray(original)) {
    selection.value.splice(
      0,
      selection.value.length,
      ...original.map((point) => ({ x: point.x + deltaX, y: point.y + deltaY })),
    );
    return;
  }

  if (selection.kind !== "element" || Array.isArray(original)) {
    return;
  }

  if (selection.value.type === "arrow" && original.type === "arrow") {
    selection.value.startX = original.startX + deltaX;
    selection.value.startY = original.startY + deltaY;
    selection.value.endX = original.endX + deltaX;
    selection.value.endY = original.endY + deltaY;
  } else if (selection.value.type !== "arrow" && original.type !== "arrow") {
    selection.value.x = original.x + deltaX;
    selection.value.y = original.y + deltaY;
  }
}

function resizeSelection(
  selection: Selection,
  original: FreehandStroke | WhiteboardElement,
  deltaX: number,
  deltaY: number,
  handle: ResizeHandle,
  context?: CanvasRenderingContext2D,
) {
  if (selection.kind === "stroke" && Array.isArray(original)) {
    const originalBounds = getStrokeBounds(original);
    let newLeft = originalBounds.left;
    let newTop = originalBounds.top;
    let newRight = originalBounds.right;
    let newBottom = originalBounds.bottom;
    
    if (handle.includes("left")) {
      newLeft = originalBounds.left + deltaX;
    } else if (handle.includes("right")) {
      newRight = originalBounds.right + deltaX;
    }
    if (handle.includes("top")) {
      newTop = originalBounds.top + deltaY;
    } else if (handle.includes("bottom")) {
      newBottom = originalBounds.bottom + deltaY;
    }

    const origWidth = Math.max(0.001, originalBounds.right - originalBounds.left);
    const origHeight = Math.max(0.001, originalBounds.bottom - originalBounds.top);

    let scaleX = (newRight - newLeft) / origWidth;
    let scaleY = (newBottom - newTop) / origHeight;
    
    if (Math.abs(scaleX) < 0.01) scaleX = 0.01 * (scaleX < 0 ? -1 : 1);
    if (Math.abs(scaleY) < 0.01) scaleY = 0.01 * (scaleY < 0 ? -1 : 1);

    selection.value.splice(
      0,
      selection.value.length,
      ...original.map((point) => ({
        x: newLeft + (point.x - originalBounds.left) * scaleX,
        y: newTop + (point.y - originalBounds.top) * scaleY,
      })),
    );
    return;
  }

  if (selection.kind !== "element" || Array.isArray(original)) {
    return;
  }

  if ((selection.value.type === "rectangle" && original.type === "rectangle") ||
      (selection.value.type === "circle" && original.type === "circle")) {
    let newLeft = original.x;
    let newTop = original.y;
    let newRight = original.x + original.width;
    let newBottom = original.y + original.height;

    if (handle.includes("left")) {
      newLeft = original.x + deltaX;
    } else if (handle.includes("right")) {
      newRight = original.x + original.width + deltaX;
    }
    if (handle.includes("top")) {
      newTop = original.y + deltaY;
    } else if (handle.includes("bottom")) {
      newBottom = original.y + original.height + deltaY;
    }

    selection.value.x = Math.min(newLeft, newRight);
    selection.value.y = Math.min(newTop, newBottom);
    selection.value.width = Math.max(1, Math.abs(newRight - newLeft));
    selection.value.height = Math.max(1, Math.abs(newBottom - newTop));
  } else if (selection.value.type === "arrow" && original.type === "arrow") {
    let origBounds: Bounds;
    if (context) {
       origBounds = getSelectionBounds(context, { kind: "element", value: original });
    } else {
       origBounds = getBounds([
          { x: original.startX, y: original.startY },
          { x: original.endX, y: original.endY },
       ]);
    }

    let nLeft = origBounds.left;
    let nTop = origBounds.top;
    let nRight = origBounds.right;
    let nBottom = origBounds.bottom;

    if (handle.includes("left")) {
      nLeft = origBounds.left + deltaX;
    } else if (handle.includes("right")) {
      nRight = origBounds.right + deltaX;
    }
    if (handle.includes("top")) {
      nTop = origBounds.top + deltaY;
    } else if (handle.includes("bottom")) {
      nBottom = origBounds.bottom + deltaY;
    }

    const origWidth = Math.max(0.001, origBounds.right - origBounds.left);
    const origHeight = Math.max(0.001, origBounds.bottom - origBounds.top);

    let scaleX = (nRight - nLeft) / origWidth;
    let scaleY = (nBottom - nTop) / origHeight;

    if (Math.abs(scaleX) < 0.01) scaleX = 0.01 * (scaleX < 0 ? -1 : 1);
    if (Math.abs(scaleY) < 0.01) scaleY = 0.01 * (scaleY < 0 ? -1 : 1);

    selection.value.startX = nLeft + (original.startX - origBounds.left) * scaleX;
    selection.value.startY = nTop + (original.startY - origBounds.top) * scaleY;
    selection.value.endX = nLeft + (original.endX - origBounds.left) * scaleX;
    selection.value.endY = nTop + (original.endY - origBounds.top) * scaleY;
  } else if (selection.value.type === "text" && original.type === "text") {
    let origBounds: Bounds;
    if (context) {
       origBounds = getSelectionBounds(context, { kind: "element", value: original });
    } else {
       origBounds = { left: original.x, top: original.y - original.fontSize, right: original.x + 20, bottom: original.y };
    }

    let nLeft = origBounds.left;
    let nTop = origBounds.top;
    let nBottom = origBounds.bottom;

    if (handle.includes("left")) {
      nLeft = origBounds.left + deltaX;
    }
    if (handle.includes("top")) {
      nTop = origBounds.top + deltaY;
    } else if (handle.includes("bottom")) {
      nBottom = origBounds.bottom + deltaY;
    }

    nBottom = Math.max(nTop + 1, nBottom);

    const origHeight = Math.max(0.001, origBounds.bottom - origBounds.top);
    const scaleY = (nBottom - nTop) / origHeight;
    const newFontSize = Math.max(8, original.fontSize * scaleY);
    
    selection.value.fontSize = newFontSize;

    if (handle.includes("left")) {
       selection.value.x = nLeft;
    } else {
       selection.value.x = original.x;
    }

    if (handle.includes("top")) {
       selection.value.y = original.y; 
    } else {
       selection.value.y = origBounds.top + newFontSize;
    }
  }
}

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function drawSelection(context: CanvasRenderingContext2D, selection: Selection) {
  const bounds = getSelectionBounds(context, selection);
  const padding = 6;

  context.save();
  context.strokeStyle = "#0d9488";
  context.lineWidth = 1.5;
  context.setLineDash([5, 4]);

  const left = bounds.left - padding;
  const top = bounds.top - padding;
  const width = bounds.right - bounds.left + padding * 2;
  const height = bounds.bottom - bounds.top + padding * 2;

  context.beginPath();
  context.rect(left, top, width, height);
  context.stroke();

  context.setLineDash([]);
  context.fillStyle = "#ffffff";
  const handleSize = 10;
  const right = left + width;
  const bottom = top + height;

  const handles = [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
  ];

  for (const handle of handles) {
    context.beginPath();
    context.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    context.fill();
    context.stroke();
  }

  context.restore();
}

function getSelectionBounds(
  context: CanvasRenderingContext2D,
  selection: Selection,
): Bounds {
  if (selection.kind === "stroke") {
    return getStrokeBounds(selection.value);
  }

  const element = selection.value;

  switch (element.type) {
    case "rectangle":
    case "circle":
      return {
        left: element.x,
        top: element.y,
        right: element.x + element.width,
        bottom: element.y + element.height,
      };
    case "arrow": {
      const angle = Math.atan2(element.endY - element.startY, element.endX - element.startX);
      const arrowheadLength = 12;
      const arrowheadAngle = Math.PI / 7;
      const leftHead = {
        x: element.endX - arrowheadLength * Math.cos(angle - arrowheadAngle),
        y: element.endY - arrowheadLength * Math.sin(angle - arrowheadAngle),
      };
      const rightHead = {
        x: element.endX - arrowheadLength * Math.cos(angle + arrowheadAngle),
        y: element.endY - arrowheadLength * Math.sin(angle + arrowheadAngle),
      };
      return getBounds([
        { x: element.startX, y: element.startY },
        { x: element.endX, y: element.endY },
        leftHead,
        rightHead,
      ]);
    }
    case "text": {
      context.font = `${element.fontSize}px Arial, sans-serif`;
      const width = context.measureText(element.text).width;
      return {
        left: element.x,
        top: element.y - element.fontSize,
        right: element.x + width,
        bottom: element.y,
      };
    }
  }
}

function getStrokeBounds(stroke: FreehandStroke): Bounds {
  return getBounds(stroke.length > 0 ? stroke : [{ x: 0, y: 0 }]);
}

function getBounds(points: Point[]): Bounds {
  return points.reduce(
    (bounds, point) => ({
      left: Math.min(bounds.left, point.x),
      top: Math.min(bounds.top, point.y),
      right: Math.max(bounds.right, point.x),
      bottom: Math.max(bounds.bottom, point.y),
    }),
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
  );
}

function isPointOnElement(
  context: CanvasRenderingContext2D,
  point: Point,
  element: WhiteboardElement,
) {
  switch (element.type) {
    case "rectangle":
      return isPointNearRectangle(point, element);
    case "circle":
      return isPointNearEllipse(point, element);
    case "arrow":
      return isPointNearArrow(point, element);
    case "text":
      return isPointInTextBounds(context, point, element);
  }
}

function isPointOnStroke(point: Point, stroke: FreehandStroke) {
  if (stroke.length === 1) {
    return distanceBetweenPoints(point, stroke[0] ?? point) <= ERASER_TOLERANCE;
  }

  for (let index = 1; index < stroke.length; index += 1) {
    const start = stroke[index - 1];
    const end = stroke[index];

    if (start && end && distanceToSegment(point, start, end) <= ERASER_TOLERANCE) {
      return true;
    }
  }

  return false;
}

function isPointNearRectangle(point: Point, rectangle: RectangleElement) {
  const left = rectangle.x;
  const right = rectangle.x + rectangle.width;
  const top = rectangle.y;
  const bottom = rectangle.y + rectangle.height;
  const edges = [
    [{ x: left, y: top }, { x: right, y: top }],
    [{ x: right, y: top }, { x: right, y: bottom }],
    [{ x: right, y: bottom }, { x: left, y: bottom }],
    [{ x: left, y: bottom }, { x: left, y: top }],
  ] as const;

  return edges.some(([start, end]) => distanceToSegment(point, start, end) <= ERASER_TOLERANCE);
}

function isPointNearEllipse(point: Point, circle: CircleElement) {
  const radiusX = circle.width / 2;
  const radiusY = circle.height / 2;

  if (radiusX === 0 || radiusY === 0) {
    return false;
  }

  const normalizedDistance = Math.hypot(
    (point.x - (circle.x + radiusX)) / radiusX,
    (point.y - (circle.y + radiusY)) / radiusY,
  );

  return Math.abs(normalizedDistance - 1) * Math.min(radiusX, radiusY) <= ERASER_TOLERANCE;
}

function isPointNearArrow(point: Point, arrow: ArrowElement) {
  const angle = Math.atan2(arrow.endY - arrow.startY, arrow.endX - arrow.startX);
  const arrowheadLength = 12;
  const arrowheadAngle = Math.PI / 7;
  const leftHead = {
    x: arrow.endX - arrowheadLength * Math.cos(angle - arrowheadAngle),
    y: arrow.endY - arrowheadLength * Math.sin(angle - arrowheadAngle),
  };
  const rightHead = {
    x: arrow.endX - arrowheadLength * Math.cos(angle + arrowheadAngle),
    y: arrow.endY - arrowheadLength * Math.sin(angle + arrowheadAngle),
  };

  return [
    [{ x: arrow.startX, y: arrow.startY }, { x: arrow.endX, y: arrow.endY }],
    [leftHead, { x: arrow.endX, y: arrow.endY }],
    [{ x: arrow.endX, y: arrow.endY }, rightHead],
  ].some(([start, end]) => distanceToSegment(point, start, end) <= ERASER_TOLERANCE);
}

function isPointInTextBounds(
  context: CanvasRenderingContext2D,
  point: Point,
  text: TextElement,
) {
  context.font = `${text.fontSize}px Arial, sans-serif`;
  const width = context.measureText(text.text).width;
  const padding = ERASER_TOLERANCE;

  return point.x >= text.x - padding
    && point.x <= text.x + width + padding
    && point.y >= text.y - text.fontSize - padding
    && point.y <= text.y + padding;
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (segmentLengthSquared === 0) {
    return distanceBetweenPoints(point, start);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / segmentLengthSquared,
    ),
  );
  const closestPoint = {
    x: start.x + projection * deltaX,
    y: start.y + projection * deltaY,
  };

  return distanceBetweenPoints(point, closestPoint);
}

function distanceBetweenPoints(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function removeByReference<T>(items: T[], item: T) {
  const index = items.indexOf(item);

  if (index >= 0) {
    items.splice(index, 1);
  }
}

"use client";

import type { ChangeEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type {
  ArrowElement,
  CircleElement,
  CreationRecord,
  DragState,
  FreehandStroke,
  Point,
  RectangleElement,
  ResizeHandle,
  Selection,
  TextElement,
  TextEditorState,
  Tool,
  WhiteboardElement,
} from "@/types/canvas";
import { STROKE_COLOR, TEXT_FONT_SIZE, renderCanvas } from "@/canvas/renderer";
import { findSelectionAtPoint, isPointOnElement, isPointOnStroke } from "@/canvas/hit-testing";
import { findResizeHandleAtPoint } from "@/canvas/selection";
import { removeByReference } from "@/editor/deletion";
import { cloneSelectionValue, createArrow, createCircle, createRectangle } from "@/editor/tools";
import { moveSelection } from "@/editor/movement";
import { resizeSelection } from "@/editor/resizing";

type BoardCanvasProps = {
  activeTool: Tool;
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

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }

      const selection = selectionRef.current;
      if (!selection) {
        return;
      }

      event.preventDefault();

      if (selection.kind === "stroke") {
        removeByReference(strokesRef.current, selection.value);
      } else {
        removeByReference(elementsRef.current, selection.value);
      }

      removeByReference(creationOrderRef.current, selection);

      selectionRef.current = null;
      dragRef.current = null;
      activePointerIdRef.current = null;

      renderCanvas(
        canvasRef.current,
        strokesRef.current,
        elementsRef.current,
        activeRectangleRef.current,
        activeCircleRef.current,
        activeArrowRef.current,
        null,
      );
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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
        const nextSelection = context ? findSelectionAtPoint(context, point, creationOrderRef.current, true) : null;
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
          } else if (findSelectionAtPoint(context, point, creationOrderRef.current, true)) {
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


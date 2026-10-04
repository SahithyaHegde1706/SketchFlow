import { createArrow, createCircle, createLine, createRectangle, createRoundedRectangle } from "@/editor/tools";
import { shouldSamplePoint } from "@/canvas/renderer/freehand";
import { resetDuplicateState } from "@/clipboard/clipboard";
import { STROKE_COLOR, TEXT_FONT_SIZE } from "@/canvas/renderer/renderer";
import type {
  ArrowElement,
  CircleElement,
  CreationRecord,
  FreehandStroke,
  LineElement,
  RectangleElement,
  RoundedRectangleElement,
  TextElement,
  WhiteboardElement,
} from "@/types/canvas";
import type { Selection, SelectionSet, TextEditorState, Tool } from "@/types/editor";
import type { Point, Viewport } from "@/types/geometry";
import type { DuplicateState } from "@/clipboard/types";

type Ref<T> = { current: T };

export type CanvasCreationOptions = {
  strokesRef: Ref<FreehandStroke[]>;
  elementsRef: Ref<WhiteboardElement[]>;
  creationOrderRef: Ref<CreationRecord[]>;
  selectionRef: Ref<SelectionSet>;
  activeStrokeRef: Ref<FreehandStroke | null>;
  activeRectangleRef: Ref<RectangleElement | null>;
  activeRectangleStartRef: Ref<Point | null>;
  activeCircleRef: Ref<CircleElement | null>;
  activeCircleStartRef: Ref<Point | null>;
  activeArrowRef: Ref<ArrowElement | null>;
  activeArrowStartRef: Ref<Point | null>;
  activeLineRef: Ref<LineElement | null>;
  activeLineStartRef: Ref<Point | null>;
  activeRoundedRectangleRef: Ref<RoundedRectangleElement | null>;
  activeRoundedRectangleStartRef: Ref<Point | null>;
  textEditorRef: Ref<TextEditorState | null>;
  duplicateStateRef: Ref<DuplicateState>;
  viewportRef: Ref<Viewport>;
  setTextEditor: (state: TextEditorState | null) => void;
  toLogicalPoint: (point: Point) => Point;
  onToolSelect: (tool: Tool) => void;
  drawCanvas: () => void;
  addHistory: () => void;
};

export function beginCanvasCreation(tool: Tool, point: Point, options: CanvasCreationOptions) {
  options.selectionRef.current = [];

  if (tool === "rectangle") {
    options.activeRectangleStartRef.current = point;
    options.activeRectangleRef.current = createRectangle(point, point);
  } else if (tool === "circle") {
    options.activeCircleStartRef.current = point;
    options.activeCircleRef.current = createCircle(point, point);
  } else if (tool === "arrow") {
    options.activeArrowStartRef.current = point;
    options.activeArrowRef.current = createArrow(point, point);
  } else if (tool === "line") {
    options.activeLineStartRef.current = point;
    options.activeLineRef.current = createLine(point, point);
  } else if (tool === "roundedRectangle") {
    options.activeRoundedRectangleStartRef.current = point;
    options.activeRoundedRectangleRef.current = createRoundedRectangle(point, point);
  } else {
    const stroke = [point];
    options.activeStrokeRef.current = stroke;
    options.strokesRef.current.push(stroke);
    options.creationOrderRef.current.push({ kind: "stroke", value: stroke });
  }
}

export function updateCanvasCreation(tool: Tool, point: Point, options: CanvasCreationOptions) {
  if (tool === "rectangle") {
    const rectangle = options.activeRectangleRef.current;
    const start = options.activeRectangleStartRef.current;
    if (rectangle && start) options.activeRectangleRef.current = createRectangle(start, point);
  } else if (tool === "circle") {
    const circle = options.activeCircleRef.current;
    const start = options.activeCircleStartRef.current;
    if (circle && start) options.activeCircleRef.current = createCircle(start, point);
  } else if (tool === "arrow") {
    const arrow = options.activeArrowRef.current;
    const start = options.activeArrowStartRef.current;
    if (arrow && start) options.activeArrowRef.current = createArrow(start, point);
  } else if (tool === "line") {
    const line = options.activeLineRef.current;
    const start = options.activeLineStartRef.current;
    if (line && start) options.activeLineRef.current = createLine(start, point);
  } else if (tool === "roundedRectangle") {
    const rectangle = options.activeRoundedRectangleRef.current;
    const start = options.activeRoundedRectangleStartRef.current;
    if (rectangle && start) options.activeRoundedRectangleRef.current = createRoundedRectangle(start, point);
  } else {
    const stroke = options.activeStrokeRef.current;
    if (stroke) {
      const lastPoint = stroke[stroke.length - 1];
      if (!lastPoint || shouldSamplePoint(lastPoint, point)) {
        stroke.push(point);
      }
    }
  }
}

export function finishCanvasCreation(tool: Tool, options: CanvasCreationOptions): Selection | null {
  let createdSelection: Selection | null = null;

  if (tool === "rectangle") {
    const rectangle = options.activeRectangleRef.current;
    if (rectangle && rectangle.width > 0 && rectangle.height > 0) {
      options.elementsRef.current.push(rectangle);
      options.creationOrderRef.current.push({ kind: "element", value: rectangle });
      createdSelection = { kind: "element", value: rectangle };
    }
    options.activeRectangleRef.current = null;
    options.activeRectangleStartRef.current = null;
  } else if (tool === "circle") {
    const circle = options.activeCircleRef.current;
    if (circle && circle.width > 0 && circle.height > 0) {
      options.elementsRef.current.push(circle);
      options.creationOrderRef.current.push({ kind: "element", value: circle });
      createdSelection = { kind: "element", value: circle };
    }
    options.activeCircleRef.current = null;
    options.activeCircleStartRef.current = null;
  } else if (tool === "arrow") {
    const arrow = options.activeArrowRef.current;
    if (arrow && (arrow.startX !== arrow.endX || arrow.startY !== arrow.endY)) {
      options.elementsRef.current.push(arrow);
      options.creationOrderRef.current.push({ kind: "element", value: arrow });
      createdSelection = { kind: "element", value: arrow };
    }
    options.activeArrowRef.current = null;
    options.activeArrowStartRef.current = null;
  } else if (tool === "line") {
    const line = options.activeLineRef.current;
    if (line && (line.startX !== line.endX || line.startY !== line.endY)) {
      options.elementsRef.current.push(line);
      options.creationOrderRef.current.push({ kind: "element", value: line });
      createdSelection = { kind: "element", value: line };
    }
    options.activeLineRef.current = null;
    options.activeLineStartRef.current = null;
  } else if (tool === "roundedRectangle") {
    const rectangle = options.activeRoundedRectangleRef.current;
    if (rectangle && rectangle.width > 0 && rectangle.height > 0) {
      options.elementsRef.current.push(rectangle);
      options.creationOrderRef.current.push({ kind: "element", value: rectangle });
      createdSelection = { kind: "element", value: rectangle };
    }
    options.activeRoundedRectangleRef.current = null;
    options.activeRoundedRectangleStartRef.current = null;
  } else {
    const stroke = options.activeStrokeRef.current;
    options.activeStrokeRef.current = null;
    if (stroke && tool === "draw") {
      createdSelection = { kind: "stroke", value: stroke };
    }
  }

  return createdSelection;
}

export function handleCanvasClick(
  event: { currentTarget: HTMLCanvasElement; clientX: number; clientY: number },
  activeTool: Tool,
  getPoint: (event: { currentTarget: HTMLCanvasElement; clientX: number; clientY: number }) => Point,
  options: CanvasCreationOptions,
) {
  if (activeTool !== "text") return;
  const screenPoint = getPoint(event);
  const editor = { x: screenPoint.x, y: screenPoint.y, value: "" };
  options.textEditorRef.current = editor;
  options.setTextEditor(editor);
}

export function handleTextChange(event: { target: { value: string } }, options: CanvasCreationOptions) {
  const editor = options.textEditorRef.current;
  if (!editor) return;
  const nextEditor = { ...editor, value: event.target.value };
  options.textEditorRef.current = nextEditor;
  options.setTextEditor(nextEditor);
}

export function cancelText(options: CanvasCreationOptions) {
  options.textEditorRef.current = null;
  options.setTextEditor(null);
}

export function commitText(options: CanvasCreationOptions) {
  const editor = options.textEditorRef.current;
  if (!editor) return;

  options.textEditorRef.current = null;
  options.setTextEditor(null);
  if (editor.value.trim().length === 0) return;

  const logicalPoint = options.toLogicalPoint({ x: editor.x, y: editor.y });
  const textElement: TextElement = {
    id: crypto.randomUUID(),
    type: "text",
    x: logicalPoint.x,
    y: logicalPoint.y,
    text: editor.value,
    fontSize: TEXT_FONT_SIZE,
    strokeColor: STROKE_COLOR,
  };
  options.elementsRef.current.push(textElement);
  options.creationOrderRef.current.push({ kind: "element", value: textElement });
  options.selectionRef.current = [{ kind: "element", value: textElement }];
  options.onToolSelect("select");
  options.drawCanvas();
  resetDuplicateState(options.duplicateStateRef.current);
  options.addHistory();
}

export function createImageInsertionHandler(options: CanvasCreationOptions) {
  return async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      alert("Image exceeds 20MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > 600 || h > 400) {
          const ratio = Math.min(600 / w, 400 / h);
          w *= ratio;
          h *= ratio;
        }

        const newImage: WhiteboardElement = {
          id: crypto.randomUUID(),
          type: "image",
          x: options.viewportRef.current.offsetX ? -options.viewportRef.current.offsetX / options.viewportRef.current.scale + 100 : 100,
          y: options.viewportRef.current.offsetY ? -options.viewportRef.current.offsetY / options.viewportRef.current.scale + 100 : 100,
          width: w,
          height: h,
          src: dataUrl,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          initialWidth: w,
          initialHeight: h,
          maintainAspectRatio: true,
          rotation: 0,
          locked: false,
        };

        options.elementsRef.current.push(newImage);
        options.creationOrderRef.current.push({ kind: "element", value: newImage });
        options.selectionRef.current = [{ kind: "element", value: newImage }];
        options.onToolSelect("select");

        options.drawCanvas();
        options.addHistory();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };
}

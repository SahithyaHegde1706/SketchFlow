import { useEffect, useRef } from "react";
import { renderCanvas, renderCropOverlay, renderMarquee } from "@/canvas/renderer/renderer";
import { normalizeMarqueeBounds } from "@/editor/marquee";
import type { CanvasSettings, CreationRecord, FreehandStroke, WhiteboardElement, Group, RectangleElement, CircleElement, ArrowElement, LineElement, RoundedRectangleElement } from "@/types/canvas";
import type { SelectionSet, MarqueeState, CropState } from "@/types/editor";
import type { Viewport, AlignmentGuide } from "@/types/geometry";

type Ref<T> = { current: T };

export type CanvasDrawingOptions = {
  canvasRef: Ref<HTMLCanvasElement | null>;
  strokesRef: Ref<FreehandStroke[]>;
  elementsRef: Ref<WhiteboardElement[]>;
  selectionRef: Ref<SelectionSet>;
  viewportRef: Ref<Viewport>;
  canvasSettings: CanvasSettings;
  handleImageLoaded: () => void;
  activeRectangleRef: Ref<RectangleElement | null>;
  activeCircleRef: Ref<CircleElement | null>;
  activeArrowRef: Ref<ArrowElement | null>;
  activeLineRef: Ref<LineElement | null>;
  activeRoundedRectangleRef: Ref<RoundedRectangleElement | null>;
  marqueeRef: Ref<MarqueeState | null>;
  cropRef: Ref<CropState | null>;
  alignmentGuidesRef: Ref<AlignmentGuide[]>;
  toolbarSelectionSignatureRef: Ref<string | null>;
  groupsRef: Ref<Group[]>;
  creationOrderRef: Ref<CreationRecord[]>;
  onDocumentChange?: (records: CreationRecord[], groups: Group[], selections: SelectionSet) => void;
};

export function renderCanvasViewport(
  options: CanvasDrawingOptions,
  viewport: Viewport = options.viewportRef.current,
  preview: RectangleElement | CircleElement | ArrowElement | LineElement | RoundedRectangleElement | null = [
    options.activeRectangleRef.current,
    options.activeCircleRef.current,
    options.activeArrowRef.current,
    options.activeLineRef.current,
    options.activeRoundedRectangleRef.current,
  ].find(Boolean) || null,
) {
  renderCanvas(
    options.canvasRef.current,
    options.strokesRef.current,
    options.elementsRef.current,
    preview,
    options.selectionRef.current,
    viewport,
    options.canvasSettings,
    options.handleImageLoaded,
  );
}

export function drawCanvas(options: CanvasDrawingOptions) {
  renderCanvas(
    options.canvasRef.current,
    options.strokesRef.current,
    options.elementsRef.current,
    [
      options.activeRectangleRef.current,
      options.activeCircleRef.current,
      options.activeArrowRef.current,
      options.activeLineRef.current,
      options.activeRoundedRectangleRef.current,
    ].find(Boolean) || null,
    options.selectionRef.current,
    options.viewportRef.current,
    options.canvasSettings,
    options.handleImageLoaded,
    options.alignmentGuidesRef.current,
  );

  if (options.marqueeRef.current && options.canvasRef.current) {
    renderMarquee(
      options.canvasRef.current,
      normalizeMarqueeBounds(options.marqueeRef.current),
      options.viewportRef.current,
    );
  }
  if (options.cropRef.current && options.canvasRef.current) {
    const ctx = options.canvasRef.current.getContext("2d");
    if (ctx) renderCropOverlay(ctx, options.cropRef.current, options.viewportRef.current);
  }

  const selectedElements = options.selectionRef.current.flatMap(selection => {
    if (selection.kind === "element") return [selection.value];
    if (selection.kind === "group") {
      return selection.value.elementIds
        .map(id => options.elementsRef.current.find(element => element.id === id))
        .filter((element): element is WhiteboardElement => Boolean(element));
    }
    return [];
  });
  const toolbarSelectionSignature = selectedElements
    .map(element => `${element.id}:${element.type}:${element.type === "text" ? element.strokeColor : ""}`)
    .sort()
    .join("|");
  if (options.toolbarSelectionSignatureRef.current !== toolbarSelectionSignature) {
    options.toolbarSelectionSignatureRef.current = toolbarSelectionSignature;
    options.onDocumentChange?.(options.creationOrderRef.current, options.groupsRef.current, options.selectionRef.current);
  }
}

type PreviewElement = RectangleElement | CircleElement | ArrowElement | LineElement | RoundedRectangleElement;

type BoardCanvasDrawingOptions = Omit<CanvasDrawingOptions, "viewportRef" | "handleImageLoaded"> & {
  viewportRefRef: Ref<Ref<Viewport> | null>;
};

export function useBoardCanvasDrawing(options: BoardCanvasDrawingOptions) {
  const drawCanvasRef = useRef<(() => void) | null>(null);
  const handleImageLoaded = () => drawCanvasRef.current?.();
  const getDrawingOptions = (): CanvasDrawingOptions => ({
    canvasRef: options.canvasRef,
    strokesRef: options.strokesRef,
    elementsRef: options.elementsRef,
    selectionRef: options.selectionRef,
    viewportRef: options.viewportRefRef.current!,
    canvasSettings: options.canvasSettings,
    handleImageLoaded,
    activeRectangleRef: options.activeRectangleRef,
    activeCircleRef: options.activeCircleRef,
    activeArrowRef: options.activeArrowRef,
    activeLineRef: options.activeLineRef,
    activeRoundedRectangleRef: options.activeRoundedRectangleRef,
    marqueeRef: options.marqueeRef,
    cropRef: options.cropRef,
    alignmentGuidesRef: options.alignmentGuidesRef,
    toolbarSelectionSignatureRef: options.toolbarSelectionSignatureRef,
    groupsRef: options.groupsRef,
    creationOrderRef: options.creationOrderRef,
    onDocumentChange: options.onDocumentChange,
  });
  const drawCanvasHandler = () => drawCanvas(getDrawingOptions());
  const renderCanvasViewportHandler = (viewport?: Viewport) =>
    renderCanvasViewport(getDrawingOptions(), viewport);
  const renderCanvasFrame = (preview?: PreviewElement | null) => {
    const activePreview = preview === undefined
      ? [
        options.activeRectangleRef.current,
        options.activeCircleRef.current,
        options.activeArrowRef.current,
        options.activeLineRef.current,
        options.activeRoundedRectangleRef.current,
      ].find(Boolean) || null
      : preview;

    renderCanvas(
      options.canvasRef.current,
      options.strokesRef.current,
      options.elementsRef.current,
      activePreview as WhiteboardElement | null,
      options.selectionRef.current,
      options.viewportRefRef.current!.current,
      options.canvasSettings,
      handleImageLoaded,
    );
  };

  useEffect(() => {
    drawCanvasRef.current = drawCanvasHandler;
  });

  return {
    drawCanvas: drawCanvasHandler,
    handleImageLoaded,
    renderCanvasFrame,
    renderCanvasViewport: renderCanvasViewportHandler,
  };
}

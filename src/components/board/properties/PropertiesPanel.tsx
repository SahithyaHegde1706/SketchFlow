import type { SelectionSet, WhiteboardElement, Group, TextElement, CanvasSettings } from "@/types/canvas";
import { isAnySelectionLocked } from "@/editor/locking";
import { useState, useEffect } from "react";
import { TransformSection } from "./transform/TransformSection";
import { StyleSection } from "./style/StyleSection";
import { TextSection } from "./text/TextSection";
import { ImageSection } from "./image/ImageSection";
import { ShadowSection } from "./shadow/ShadowSection";
import { ActionsSection } from "./actions/ActionsSection";

type PropertiesPanelProps = {
  selections: SelectionSet;
  elements: WhiteboardElement[];
  groups: Group[];
  canvasSettings: CanvasSettings;
  onUpdateProperties: (updates: Partial<WhiteboardElement>, commitHistory?: boolean) => void;
  onUpdateCanvasSettings: (settings: CanvasSettings) => void;
  onStartCrop?: () => void;
  onClose?: () => void;
};

// Helper to get all flattened whiteboard elements from the selection
function getSelectedElements(selections: SelectionSet, allElements: WhiteboardElement[]): WhiteboardElement[] {
  const selectedElements: WhiteboardElement[] = [];

  for (const selection of selections) {
    if (selection.kind === "element") {
      selectedElements.push(selection.value);
    } else if (selection.kind === "group") {
      for (const id of selection.value.elementIds) {
        const el = allElements.find(e => e.id === id);
        if (el) selectedElements.push(el);
      }
    }
  }

  return selectedElements;
}

export function PropertiesPanel({ selections, elements, canvasSettings, onUpdateProperties, onUpdateCanvasSettings, onStartCrop }: PropertiesPanelProps) {
  const selectedElements = getSelectedElements(selections, elements);
  const isLocked = isAnySelectionLocked(selections, elements);

  const [localOpacity, setLocalOpacity] = useState<number | null>(null);
  const [localCornerRadius, setLocalCornerRadius] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalOpacity(null);
    setLocalCornerRadius(null);
  }, [selections]);

  if (selectedElements.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2 dark:text-slate-200 dark:border-slate-700">
          Canvas Settings
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600 dark:text-slate-400">Background</label>
            <input
              type="color"
              value={canvasSettings.backgroundColor}
              onChange={(e) => onUpdateCanvasSettings({ ...canvasSettings, backgroundColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
              title="Background Color"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600 dark:text-slate-400">Grid</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={canvasSettings.showGrid}
                onChange={(e) => onUpdateCanvasSettings({ ...canvasSettings, showGrid: e.target.checked })}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 dark:bg-slate-700 dark:peer-checked:bg-teal-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600 dark:text-slate-400">Grid Size</label>
            <select
              value={canvasSettings.gridSize}
              onChange={(e) => {
                const size = Number(e.target.value);
                onUpdateCanvasSettings({
                  ...canvasSettings,
                  gridSize: size,
                  snapSettings: {
                    ...(canvasSettings.snapSettings || { enabled: true, gridEnabled: false, threshold: 6 }),
                    gridSize: size,
                  },
                });
              }}
              className="border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
              disabled={!canvasSettings.showGrid && !(canvasSettings.snapSettings?.gridEnabled)}
            >
              <option value="8">8</option>
              <option value="16">16</option>
              <option value="24">24</option>
              <option value="32">32</option>
            </select>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-4 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600 dark:text-slate-400">Snapping</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={canvasSettings.snapSettings?.enabled ?? true}
                  onChange={(e) => onUpdateCanvasSettings({
                    ...canvasSettings,
                    snapSettings: {
                      ...(canvasSettings.snapSettings || { gridEnabled: false, gridSize: 16, threshold: 6 }),
                      enabled: e.target.checked,
                    },
                  })}
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 dark:bg-slate-700 dark:peer-checked:bg-teal-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600 dark:text-slate-400">Grid Snap</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={canvasSettings.snapSettings?.gridEnabled ?? false}
                  onChange={(e) => onUpdateCanvasSettings({
                    ...canvasSettings,
                    snapSettings: {
                      ...(canvasSettings.snapSettings || { enabled: true, gridSize: 16, threshold: 6 }),
                      gridEnabled: e.target.checked,
                    },
                  })}
                  disabled={!(canvasSettings.snapSettings?.enabled ?? true)}
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 peer-disabled:opacity-50 dark:bg-slate-700 dark:peer-checked:bg-teal-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Derive shared properties
  const types = Array.from(new Set(selectedElements.map(e => e.type)));
  const title = selectedElements.length === 1
    ? types[0]!.charAt(0).toUpperCase() + types[0]!.slice(1)
    : "Multiple objects";

  const allHaveStrokeColor = selectedElements.every(e => "strokeColor" in e);
  const strokeColor = allHaveStrokeColor
    ? (new Set(selectedElements.map(e => e.strokeColor)).size === 1 ? selectedElements[0]?.strokeColor : "mixed")
    : undefined;

  const allHaveStrokeWidth = selectedElements.every(e => "strokeWidth" in e);
  const strokeWidth = allHaveStrokeWidth
    ? (new Set(selectedElements.map(e => (e as Extract<WhiteboardElement, { strokeWidth: number }>).strokeWidth)).size === 1
      ? (selectedElements[0] as Extract<WhiteboardElement, { strokeWidth: number }>).strokeWidth : "mixed")
    : undefined;

  const fillableElements = selectedElements.filter(e => e.type === "rectangle" || e.type === "circle" || e.type === "roundedRectangle");
  const hasFillable = fillableElements.length > 0;

  const roundedRectangleElements = selectedElements.filter(e => e.type === "roundedRectangle");
  const hasRoundedRectangle = roundedRectangleElements.length > 0;

  const radius = hasRoundedRectangle
    ? (new Set(roundedRectangleElements.map(e => (e as Extract<WhiteboardElement, { radius: number }>).radius)).size === 1
      ? (roundedRectangleElements[0] as Extract<WhiteboardElement, { radius: number }>).radius : "mixed")
    : undefined;

  const fillColor = hasFillable
    ? (new Set(fillableElements.map(e => (e as Extract<WhiteboardElement, { fillColor?: string | null }>).fillColor || "transparent")).size === 1
        ? ((fillableElements[0] as Extract<WhiteboardElement, { fillColor?: string | null }>).fillColor || "transparent") : "mixed")
    : undefined;

  const rotationSet = new Set(selectedElements.map(e => Math.round((e.rotation || 0) * (180 / Math.PI))));
  const rotationDegrees = rotationSet.size === 1 ? Array.from(rotationSet)[0] : "mixed";

  const textElements = selectedElements.filter(e => e.type === "text") as TextElement[];
  const hasText = textElements.length > 0;

  const textContent = hasText
    ? (new Set(textElements.map(e => e.text)).size === 1 ? textElements[0].text : "mixed")
    : undefined;

  const fontSize = hasText
    ? (new Set(textElements.map(e => e.fontSize)).size === 1 ? textElements[0].fontSize : "mixed")
    : undefined;

  const fontFamily = hasText
    ? (new Set(textElements.map(e => e.fontFamily || "Arial")).size === 1 ? (textElements[0].fontFamily || "Arial") : "mixed")
    : undefined;

  const fontWeight = hasText
    ? (new Set(textElements.map(e => e.fontWeight || "normal")).size === 1 ? (textElements[0].fontWeight || "normal") : "mixed")
    : undefined;

  const fontStyle = hasText
    ? (new Set(textElements.map(e => e.fontStyle || "normal")).size === 1 ? (textElements[0].fontStyle || "normal") : "mixed")
    : undefined;

  const textDecoration = hasText
    ? (new Set(textElements.map(e => e.textDecoration || "none")).size === 1 ? (textElements[0].textDecoration || "none") : "mixed")
    : undefined;

  const textAlign = hasText
    ? (new Set(textElements.map(e => e.textAlign || "left")).size === 1 ? (textElements[0].textAlign || "left") : "mixed")
    : undefined;

  const lineHeight = hasText
    ? (new Set(textElements.map(e => e.lineHeight || 1.2)).size === 1 ? (textElements[0].lineHeight || 1.2) : "mixed")
    : undefined;

  const imageElements = selectedElements.filter(e => e.type === "image") as (WhiteboardElement & { type: "image" })[];
  const isSingleImage = imageElements.length === 1 && selectedElements.length === 1;
  const hasImages = imageElements.length > 0;
  const imageElement: (WhiteboardElement & { type: "image" }) | null = isSingleImage ? imageElements[0] : null;

  // Multi-image common properties
  const imageOpacity = hasImages
    ? (new Set(imageElements.map(e => Math.round((e.opacity ?? 1) * 100))).size === 1
      ? Math.round((imageElements[0].opacity ?? 1) * 100) : "mixed")
    : undefined;

  const imageStrokeColor = hasImages
    ? (new Set(imageElements.map(e => e.strokeColor ?? undefined)).size === 1
      ? imageElements[0].strokeColor : "mixed")
    : undefined;

  const imageStrokeWidth = hasImages
    ? (new Set(imageElements.map(e => e.strokeWidth ?? 0)).size === 1
      ? imageElements[0].strokeWidth : "mixed")
    : undefined;

  const imageCornerRadius = hasImages
    ? (new Set(imageElements.map(e => e.cornerRadius ?? 0)).size === 1
      ? imageElements[0].cornerRadius : "mixed")
    : undefined;

  const allLocked = selectedElements.every(e => e.locked);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2 dark:text-slate-200 dark:border-slate-700">
        {title}
      </div>

      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-300">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Selection is locked. Unlock to edit.</span>
        </div>
      )}

      <ActionsSection
        allLocked={allLocked}
        selectedElementsCount={selectedElements.length}
        onUpdateProperties={onUpdateProperties}
      />

      <StyleSection
        allHaveStrokeColor={allHaveStrokeColor}
        strokeColor={strokeColor}
        allHaveStrokeWidth={allHaveStrokeWidth}
        strokeWidth={strokeWidth}
        hasFillable={hasFillable}
        fillColor={fillColor}
        hasRoundedRectangle={hasRoundedRectangle}
        radius={radius}
        isLocked={isLocked}
        onUpdateProperties={onUpdateProperties}
      />

      {hasText && (
        <TextSection
          textContent={textContent}
          fontSize={fontSize}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          fontStyle={fontStyle}
          textDecoration={textDecoration}
          textAlign={textAlign}
          lineHeight={lineHeight}
          isLocked={isLocked}
          onUpdateProperties={onUpdateProperties}
        />
      )}

      <TransformSection
        rotationDegrees={rotationDegrees}
        isLocked={isLocked}
        onUpdateProperties={onUpdateProperties}
      />

      <ImageSection
        isSingleImage={isSingleImage}
        imageElement={imageElement}
        hasImages={hasImages}
        imageOpacity={imageOpacity}
        imageStrokeColor={imageStrokeColor}
        imageStrokeWidth={imageStrokeWidth}
        imageCornerRadius={imageCornerRadius}
        localOpacity={localOpacity}
        localCornerRadius={localCornerRadius}
        setLocalOpacity={setLocalOpacity}
        setLocalCornerRadius={setLocalCornerRadius}
        isLocked={isLocked}
        onUpdateProperties={onUpdateProperties}
        onStartCrop={onStartCrop}
      />

      {isSingleImage && imageElement && (
        <ShadowSection
          imageElement={imageElement}
          isLocked={isLocked}
          onUpdateProperties={onUpdateProperties}
        />
      )}
    </div>
  );
}

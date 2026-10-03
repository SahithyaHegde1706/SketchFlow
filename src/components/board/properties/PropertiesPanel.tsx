import type { SelectionSet, WhiteboardElement, Group, TextElement, CanvasSettings } from "@/types/canvas";
import { isAnySelectionLocked } from "@/editor/locking";

type PropertiesPanelProps = {
  selections: SelectionSet;
  elements: WhiteboardElement[];
  groups: Group[];
  canvasSettings: CanvasSettings;
  onUpdateProperties: (updates: Partial<WhiteboardElement>) => void;
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

  if (selectedElements.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
          Canvas Settings
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Background</label>
            <input 
              type="color" 
              value={canvasSettings.backgroundColor}
              onChange={(e) => onUpdateCanvasSettings({ ...canvasSettings, backgroundColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
              title="Background Color"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Grid</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={canvasSettings.showGrid}
                onChange={(e) => onUpdateCanvasSettings({ ...canvasSettings, showGrid: e.target.checked })}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Grid Size</label>
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
              className="border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400"
              disabled={!canvasSettings.showGrid && !(canvasSettings.snapSettings?.gridEnabled)}
            >
              <option value="8">8</option>
              <option value="16">16</option>
              <option value="24">24</option>
              <option value="32">32</option>
            </select>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Snapping</label>
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
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Grid Snap</label>
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
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 peer-disabled:opacity-50"></div>
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
  const imageElement = isSingleImage ? imageElements[0] : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
        {title}
      </div>

      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Selection is locked. Unlock to edit.</span>
        </div>
      )}

      {(allHaveStrokeColor || allHaveStrokeWidth) && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stroke</h3>
          
          {allHaveStrokeColor && (
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Color</label>
              <div className="flex items-center gap-2">
                {strokeColor === "mixed" ? (
                  <span className="text-xs text-slate-400 italic">Mixed</span>
                ) : null}
                <input 
                  type="color" 
                  value={strokeColor !== "mixed" && strokeColor ? strokeColor : "#000000"}
                  onChange={(e) => onUpdateProperties({ strokeColor: e.target.value })}
                  disabled={isLocked}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Stroke Color"
                />
              </div>
            </div>
          )}

          {allHaveStrokeWidth && (
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Width</label>
              <div className="flex items-center gap-2">
                {strokeWidth === "mixed" ? (
                  <span className="text-xs text-slate-400 italic">Mixed</span>
                ) : null}
                <select
                  value={strokeWidth !== "mixed" ? strokeWidth : ""}
                  onChange={(e) => onUpdateProperties({ strokeWidth: Number(e.target.value) })}
                  disabled={isLocked}
                  className="border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {strokeWidth === "mixed" && <option value="" disabled>Mixed</option>}
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="6">6</option>
                  <option value="8">8</option>
                </select>
              </div>
            </div>
          )}

          {hasFillable && (
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Fill</label>
              <div className="flex items-center gap-2">
                {fillColor === "mixed" ? (
                  <span className="text-xs text-slate-400 italic">Mixed</span>
                ) : null}
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={fillColor !== "mixed" && fillColor !== "transparent" && fillColor !== "none" && fillColor ? fillColor : "#ffffff"}
                    onChange={(e) => onUpdateProperties({ fillColor: e.target.value })}
                    disabled={isLocked || fillColor === "transparent" || fillColor === "none"}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Fill Color"
                  />
                  <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={fillColor === "transparent" || fillColor === "none"}
                      onChange={(e) => onUpdateProperties({ fillColor: e.target.checked ? "transparent" : "#ffffff" })}
                      disabled={isLocked}
                      className="cursor-pointer disabled:cursor-not-allowed"
                    />
                    None
                  </label>
                </div>
              </div>
            </div>
          )}


          {hasRoundedRectangle && (
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Corner Radius</label>
              <div className="flex items-center gap-2">
                {radius === "mixed" ? (
                  <span className="text-xs text-slate-400 italic">Mixed</span>
                ) : null}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={radius !== "mixed" && radius !== undefined ? radius : ""}
                    placeholder={radius === "mixed" ? "Mixed" : "12"}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 0) onUpdateProperties({ radius: val });
                    }}
                    disabled={isLocked}
                    className="w-16 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-slate-500">px</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {hasText && (
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Text</h3>
          
          <div className="space-y-2">
            <label className="text-sm text-slate-600">Content</label>
            {textContent === "mixed" ? (
              <div className="text-xs text-slate-400 italic p-2 border border-slate-100 rounded bg-slate-50">Multiple text elements</div>
            ) : (
              <textarea
                value={textContent || ""}
                onChange={(e) => onUpdateProperties({ text: e.target.value })}
                disabled={isLocked}
                className="w-full border border-slate-200 rounded p-2 text-sm text-slate-700 min-h-[60px] resize-y focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed"
                placeholder="Empty text"
              />
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Font Size</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="8"
                step="2"
                value={fontSize !== "mixed" ? fontSize : ""}
                placeholder={fontSize === "mixed" ? "Mixed" : "20"}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 8) onUpdateProperties({ fontSize: val });
                }}
                disabled={isLocked}
                className="w-16 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-slate-500">px</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Font</label>
            <div className="flex items-center gap-2">
              <select
                value={fontFamily !== "mixed" ? fontFamily : ""}
                onChange={(e) => onUpdateProperties({ fontFamily: e.target.value })}
                disabled={isLocked}
                className="w-32 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {fontFamily === "mixed" && <option value="" disabled>Mixed</option>}
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Style</label>
            <div className="flex items-center gap-1 border border-slate-200 rounded p-1">
              <button
                title="Bold"
                onClick={() => onUpdateProperties({ fontWeight: fontWeight === "bold" ? "normal" : "bold" })}
                disabled={isLocked}
                className={`w-7 h-7 flex items-center justify-center rounded font-bold disabled:opacity-40 disabled:cursor-not-allowed ${fontWeight === "bold" ? "bg-teal-100 text-teal-800" : "hover:bg-slate-100 text-slate-700"}`}
              >
                B
              </button>
              <button
                title="Italic"
                onClick={() => onUpdateProperties({ fontStyle: fontStyle === "italic" ? "normal" : "italic" })}
                disabled={isLocked}
                className={`w-7 h-7 flex items-center justify-center rounded italic disabled:opacity-40 disabled:cursor-not-allowed ${fontStyle === "italic" ? "bg-teal-100 text-teal-800" : "hover:bg-slate-100 text-slate-700"}`}
              >
                I
              </button>
              <button
                title="Underline"
                onClick={() => onUpdateProperties({ textDecoration: textDecoration === "underline" ? "none" : "underline" })}
                disabled={isLocked}
                className={`w-7 h-7 flex items-center justify-center rounded underline disabled:opacity-40 disabled:cursor-not-allowed ${textDecoration === "underline" ? "bg-teal-100 text-teal-800" : "hover:bg-slate-100 text-slate-700"}`}
              >
                U
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Align</label>
            <div className="flex items-center gap-1 border border-slate-200 rounded p-1">
              <button
                title="Left Align"
                onClick={() => onUpdateProperties({ textAlign: "left" })}
                disabled={isLocked}
                className={`w-7 h-7 flex items-center justify-center rounded disabled:opacity-40 disabled:cursor-not-allowed ${textAlign === "left" ? "bg-teal-100 text-teal-800" : "hover:bg-slate-100 text-slate-700"}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="19" y2="18"></line></svg>
              </button>
              <button
                title="Center Align"
                onClick={() => onUpdateProperties({ textAlign: "center" })}
                disabled={isLocked}
                className={`w-7 h-7 flex items-center justify-center rounded disabled:opacity-40 disabled:cursor-not-allowed ${textAlign === "center" ? "bg-teal-100 text-teal-800" : "hover:bg-slate-100 text-slate-700"}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="5" y1="18" x2="19" y2="18"></line></svg>
              </button>
              <button
                title="Right Align"
                onClick={() => onUpdateProperties({ textAlign: "right" })}
                disabled={isLocked}
                className={`w-7 h-7 flex items-center justify-center rounded disabled:opacity-40 disabled:cursor-not-allowed ${textAlign === "right" ? "bg-teal-100 text-teal-800" : "hover:bg-slate-100 text-slate-700"}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="9" y1="12" x2="21" y2="12"></line><line x1="5" y1="18" x2="21" y2="18"></line></svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Line Height</label>
            <div className="flex items-center gap-2">
              <select
                value={lineHeight !== "mixed" ? lineHeight : ""}
                onChange={(e) => onUpdateProperties({ lineHeight: Number(e.target.value) })}
                disabled={isLocked}
                className="w-16 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {lineHeight === "mixed" && <option value="" disabled>Mixed</option>}
                <option value="1">1.0</option>
                <option value="1.2">1.2</option>
                <option value="1.5">1.5</option>
                <option value="1.8">1.8</option>
                <option value="2">2.0</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Transform</h3>
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-600">Rotation</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={rotationDegrees !== "mixed" ? rotationDegrees : ""}
              placeholder={rotationDegrees === "mixed" ? "Mixed" : "0"}
              onChange={(e) => {
                const deg = parseFloat(e.target.value);
                if (!isNaN(deg)) {
                  onUpdateProperties({ rotation: deg * (Math.PI / 180) });
                }
              }}
              disabled={isLocked}
              className="w-20 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-slate-500">°</span>
          </div>
        </div>
      </div>

      {isSingleImage && imageElement && (
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Image</h3>
          
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Width</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                value={Math.round(imageElement.width)}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (isNaN(val) || val < 1) return;
                  if (imageElement.maintainAspectRatio) {
                    const ratio = imageElement.naturalHeight / imageElement.naturalWidth;
                    onUpdateProperties({ width: val, height: val * ratio });
                  } else {
                    onUpdateProperties({ width: val });
                  }
                }}
                disabled={isLocked}
                className="w-20 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-slate-500">px</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Height</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                value={Math.round(imageElement.height)}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (isNaN(val) || val < 1) return;
                  if (imageElement.maintainAspectRatio) {
                    const ratio = imageElement.naturalWidth / imageElement.naturalHeight;
                    onUpdateProperties({ height: val, width: val * ratio });
                  } else {
                    onUpdateProperties({ height: val });
                  }
                }}
                disabled={isLocked}
                className="w-20 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-slate-500">px</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Maintain Aspect Ratio</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={imageElement.maintainAspectRatio ?? true}
                onChange={(e) => onUpdateProperties({ maintainAspectRatio: e.target.checked })}
                disabled={isLocked}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 peer-disabled:opacity-50"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Rotation</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const current = imageElement.rotation || 0;
                  onUpdateProperties({ rotation: current - Math.PI / 2 });
                }}
                disabled={isLocked}
                className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Rotate Left (-90°)"
              >
                ⟲
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = imageElement.rotation || 0;
                  onUpdateProperties({ rotation: current + Math.PI / 2 });
                }}
                disabled={isLocked}
                className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Rotate Right (+90°)"
              >
                ⟳
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdateProperties({ flipX: !(imageElement.flipX ?? false) })}
              disabled={isLocked}
              className={`flex-1 text-center py-1.5 px-2 border rounded text-sm transition-colors ${
                imageElement.flipX ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              Flip Horizontal
            </button>
            <button
              type="button"
              onClick={() => onUpdateProperties({ flipY: !(imageElement.flipY ?? false) })}
              disabled={isLocked}
              className={`flex-1 text-center py-1.5 px-2 border rounded text-sm transition-colors ${
                imageElement.flipY ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              Flip Vertical
            </button>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                if (onStartCrop) onStartCrop();
              }}
              disabled={isLocked}
              className="w-full text-center py-1.5 px-3 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Crop
            </button>
            <button
              type="button"
              onClick={() => {
                const w = imageElement.initialWidth || imageElement.naturalWidth;
                const h = imageElement.initialHeight || imageElement.naturalHeight;
                onUpdateProperties({ width: w, height: h });
              }}
              disabled={isLocked}
              className="w-full text-center py-1.5 px-3 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset Size
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateProperties({ rotation: 0 });
              }}
              disabled={isLocked || (imageElement.rotation || 0) === 0}
              className="w-full text-center py-1.5 px-3 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset Rotation
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateProperties({ flipX: false, flipY: false });
              }}
              disabled={isLocked || (!(imageElement.flipX ?? false) && !(imageElement.flipY ?? false))}
              className="w-full text-center py-1.5 px-3 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset Flips
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}

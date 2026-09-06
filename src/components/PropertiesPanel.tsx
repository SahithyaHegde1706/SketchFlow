import type { SelectionSet, WhiteboardElement, Group, TextElement } from "@/types/canvas";

type PropertiesPanelProps = {
  selections: SelectionSet;
  elements: WhiteboardElement[];
  groups: Group[];
  onUpdateProperties: (updates: Partial<WhiteboardElement>) => void;
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

export function PropertiesPanel({ selections, elements, onUpdateProperties }: PropertiesPanelProps) {
  const selectedElements = getSelectedElements(selections, elements);
  
  if (selectedElements.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center text-slate-400">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-50">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        </svg>
        <p className="text-sm font-medium">No selection</p>
        <p className="text-xs mt-1">Select an element to edit its properties.</p>
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

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
        {title}
      </div>

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
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
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
                  className="border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400"
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
                className="w-full border border-slate-200 rounded p-2 text-sm text-slate-700 min-h-[60px] resize-y focus:outline-none focus:border-teal-400"
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
                className="w-20 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400"
              />
              <span className="text-xs text-slate-500">px</span>
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
              className="w-20 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400"
            />
            <span className="text-xs text-slate-500">°</span>
          </div>
        </div>
      </div>
      
    </div>
  );
}

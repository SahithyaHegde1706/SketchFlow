import { useState, useMemo } from "react";
import type { CreationRecord, Group, SelectionSet, WhiteboardElement, Selection } from "@/types/canvas";
import type { LayerOperation } from "@/editor/layering";
import { isItemLocked } from "@/editor/locking";

type LayersPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  records: CreationRecord[];
  groups: Group[];
  selections: SelectionSet;
  onSelect: (selections: SelectionSet) => void;
  onDelete: () => void;
  onLayerOperation: (op: LayerOperation) => void;
  onToggleLock?: (selection: Selection) => void;
};

type LayerNode = {
  id: string;
  type: "group" | "element" | "stroke";
  label: string;
  isSelected: boolean;
  isLocked?: boolean;
  isExpanded?: boolean;
  children?: LayerNode[];
  record?: CreationRecord;
  group?: Group;
};

function getElementLabel(element: WhiteboardElement): string {
  switch (element.type) {
    case "rectangle": return "Rectangle";
    case "roundedRectangle": return "Rounded Rectangle";
    case "circle": return "Circle";
    case "arrow": return "Arrow";
    case "line": return "Line";
    case "text": {
      const preview = element.text.length > 10 ? element.text.slice(0, 10) + "..." : element.text;
      return `Text: ${preview}`;
    }
    case "image": return "Image";
  }
}

export function LayersPanel({
  isOpen,
  onClose,
  records,
  groups,
  selections,
  onSelect,
  onDelete,
  onLayerOperation,
  onToggleLock,
}: LayersPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const elements = useMemo(
    () => records.filter((r): r is Extract<CreationRecord, { kind: "element" }> => r.kind === "element").map(r => r.value),
    [records]
  );

  const nodes = useMemo(() => {
    const emittedGroups = new Set<string>();
    const result: LayerNode[] = [];

    // Traverse from top (end of array) to bottom (start of array)
    for (let i = records.length - 1; i >= 0; i--) {
      const record = records[i]!;
      
      if (record.kind === "element") {
        const group = groups.find(g => g.elementIds.includes(record.value.id));
        if (group) {
          if (!emittedGroups.has(group.id)) {
            // Emit group
            emittedGroups.add(group.id);
            const isGroupSelected = selections.some(s => s.kind === "group" && s.value.id === group.id);
            const isExpanded = expandedGroups.has(group.id);
            const isGroupLocked = isItemLocked(group, elements);
            
            // Gather children
            const children: LayerNode[] = [];
            // We find children in the correct z-order (top to bottom)
            for (let j = records.length - 1; j >= 0; j--) {
              const childRecord = records[j]!;
              if (childRecord.kind === "element" && group.elementIds.includes(childRecord.value.id)) {
                children.push({
                  id: childRecord.value.id,
                  type: "element",
                  label: getElementLabel(childRecord.value),
                  isSelected: selections.some(s => s.kind === "element" && s.value.id === childRecord.value.id),
                  isLocked: Boolean(childRecord.value.locked),
                  record: childRecord,
                });
              }
            }

            result.push({
              id: group.id,
              type: "group",
              label: "Group",
              isSelected: isGroupSelected,
              isLocked: isGroupLocked,
              isExpanded,
              children,
              group,
            });
          }
        } else {
          result.push({
            id: record.value.id,
            type: "element",
            label: getElementLabel(record.value),
            isSelected: selections.some(s => s.kind === "element" && s.value.id === record.value.id),
            isLocked: Boolean(record.value.locked),
            record,
          });
        }
      } else {
        result.push({
          id: `stroke-${i}`, // Weak fallback ID since strokes don't have IDs
          type: "stroke",
          label: "Freehand",
          isSelected: selections.some(s => s.kind === "stroke" && s.value === record.value),
          isLocked: Boolean(record.value.locked),
          record,
        });
      }
    }
    
    return result;
  }, [records, groups, selections, expandedGroups, elements]);

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSelectNode = (node: LayerNode, e: React.MouseEvent) => {
    const newSelection = {
      kind: node.type as Selection["kind"],
      value: (node.group || node.record?.value)!
    } as Selection;

    if (e.shiftKey) {
      // Toggle
      const exists = selections.some(s => s.kind === newSelection.kind && s.value === newSelection.value);
      if (exists) {
        onSelect(selections.filter(s => !(s.kind === newSelection.kind && s.value === newSelection.value)));
      } else {
        onSelect([...selections, newSelection]);
      }
    } else {
      onSelect([newSelection]);
    }
  };

  const handleToggleLockNode = (node: LayerNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const selection = {
      kind: node.type as Selection["kind"],
      value: (node.group || node.record?.value)!
    } as Selection;
    onToggleLock?.(selection);
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">Layers</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          aria-label="Close layers panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex gap-1 p-2 border-b border-slate-100 justify-center">
        <button onClick={() => onLayerOperation("bring-to-front")} className="p-1.5 rounded bg-slate-50 text-slate-600 hover:bg-slate-100" title="Bring to Front">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        </button>
        <button onClick={() => onLayerOperation("bring-forward")} className="p-1.5 rounded bg-slate-50 text-slate-600 hover:bg-slate-100" title="Bring Forward">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15V9M9 12l3-3 3 3"/></svg>
        </button>
        <button onClick={() => onLayerOperation("send-backward")} className="p-1.5 rounded bg-slate-50 text-slate-600 hover:bg-slate-100" title="Send Backward">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v6M9 12l3 3 3-3"/></svg>
        </button>
        <button onClick={() => onLayerOperation("send-to-back")} className="p-1.5 rounded bg-slate-50 text-slate-600 hover:bg-slate-100" title="Send to Back">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
        </button>
        <div className="w-px bg-slate-200 mx-1" />
        <button onClick={onDelete} className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100" title="Delete">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {nodes.map(node => (
          <LayerNodeView key={node.id} node={node} onToggle={toggleGroup} onSelect={handleSelectNode} onToggleLock={handleToggleLockNode} />
        ))}
        {nodes.length === 0 && (
          <div className="text-center text-xs text-slate-400 mt-8">No layers</div>
        )}
      </div>
    </div>
  );
}

function LayerNodeView({
  node,
  onToggle,
  onSelect,
  onToggleLock,
  depth = 0,
}: {
  node: LayerNode;
  onToggle: (id: string, e: React.MouseEvent) => void;
  onSelect: (node: LayerNode, e: React.MouseEvent) => void;
  onToggleLock?: (node: LayerNode, e: React.MouseEvent) => void;
  depth?: number;
}) {
  return (
    <>
      <div 
        className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm select-none
          ${node.isSelected ? 'bg-teal-50 text-teal-900 font-medium' : 'hover:bg-slate-50 text-slate-700'}
        `}
        style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
        onClick={(e) => onSelect(node, e)}
      >
        {node.type === "group" ? (
          <button onClick={(e) => onToggle(node.id, e)} className="p-0.5 -ml-1 text-slate-400 hover:text-slate-600 focus:outline-none">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transform transition-transform ${node.isExpanded ? 'rotate-90' : ''}`}>
               <path d="M9 18l6-6-6-6" />
             </svg>
          </button>
        ) : (
          <div className="w-3.5 shrink-0" />
        )}
        
        <span className="text-slate-400 shrink-0">
          {node.type === "group" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
          {node.type === "stroke" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>}
          {node.type === "element" && node.label.startsWith("Rect") && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>}
          {node.type === "element" && node.label.startsWith("Circ") && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>}
          {node.type === "element" && node.label.startsWith("Arrow") && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>}
          {node.type === "element" && node.label.startsWith("Text") && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>}
          {node.type === "element" && node.label === "Image" && <span>🖼️</span>}
        </span>
        <span className="truncate flex-1">{node.label}</span>

        <button
          type="button"
          onClick={(e) => onToggleLock?.(node, e)}
          title={node.isLocked ? "Unlock layer" : "Lock layer"}
          aria-label={node.isLocked ? "Unlock layer" : "Lock layer"}
          className={`p-1 rounded transition shrink-0 ${
            node.isLocked
              ? "text-red-500 hover:bg-red-50"
              : "text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-600 hover:bg-slate-100"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d={node.isLocked ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1"} />
          </svg>
        </button>
      </div>
      
      {node.isExpanded && node.children?.map(child => (
        <LayerNodeView key={child.id} node={child} onToggle={onToggle} onSelect={onSelect} onToggleLock={onToggleLock} depth={depth + 1} />
      ))}
    </>
  );
}

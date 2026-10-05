"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { WhiteboardElement } from "@/types/canvas";
import { getCombinedSelectionBounds } from "@/canvas/interaction/selection";
import { getPresenceSnapshot, subscribePresence, subscribeViewport, getViewportSnapshot } from "@/collaboration/presenceStore";
import { getSelectionSnapshot, pruneRemoteSelections, subscribeSelections } from "@/collaboration/selectionStore";

type CollaboratorSelectionsProps = {
  boardId: string;
  elements: WhiteboardElement[];
};

export function CollaboratorSelections({ boardId, elements }: CollaboratorSelectionsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selections = useSyncExternalStore(subscribeSelections, getSelectionSnapshot, getSelectionSnapshot);
  const presence = useSyncExternalStore(subscribePresence, getPresenceSnapshot, getPresenceSnapshot);
  const currentViewport = useSyncExternalStore(subscribeViewport, getViewportSnapshot, getViewportSnapshot);

  useEffect(() => {
    pruneRemoteSelections(boardId, new Set(elements.map((element) => element.id)));
  }, [boardId, elements, selections.users]);

  useEffect(() => {
    const overlay = canvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const bounds = overlay.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.round(bounds.width * dpr));
      const pixelHeight = Math.max(1, Math.round(bounds.height * dpr));
      if (overlay.width !== pixelWidth) overlay.width = pixelWidth;
      if (overlay.height !== pixelHeight) overlay.height = pixelHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, bounds.width, bounds.height);

      if (selections.boardId !== boardId || presence.boardId !== boardId) return;
      const activeViewport = currentViewport;
      const visibleSelections = Object.values(selections.users)
        .filter((selection) => selection.selectedElementIds.length > 0)
        .filter((selection) => presence.users[selection.userId])
        .map((selection) => ({ selection, user: presence.users[selection.userId]! }));

      visibleSelections.forEach(({ selection, user }, index) => {
        const selected = selection.selectedElementIds.flatMap((id) => {
          const element = elements.find((candidate) => candidate.id === id);
          return element ? [{ kind: "element" as const, value: element }] : [];
        });
        if (!selected.length) return;

        const worldBounds = getCombinedSelectionBounds(ctx, selected, elements);
        if (![worldBounds.left, worldBounds.top, worldBounds.right, worldBounds.bottom].every(Number.isFinite)) return;

        const padding = 6;
        const left = (worldBounds.left - padding) * activeViewport.scale + activeViewport.offsetX;
        const top = (worldBounds.top - padding) * activeViewport.scale + activeViewport.offsetY;
        const width = (worldBounds.right - worldBounds.left + padding * 2) * activeViewport.scale;
        const height = (worldBounds.bottom - worldBounds.top + padding * 2) * activeViewport.scale;

        ctx.save();
        ctx.strokeStyle = user.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 4]);
        ctx.strokeRect(left, top, width, height);
        ctx.setLineDash([]);

        const label = user.displayName;
        ctx.font = "12px sans-serif";
        const labelWidth = ctx.measureText(label).width + 12;
        const labelX = Math.max(2, Math.min(left, bounds.width - labelWidth - 2));
        const labelY = Math.max(16 + index * 18, top - 4);
        ctx.fillStyle = user.color;
        ctx.fillRect(labelX, labelY - 15, labelWidth, 18);
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.fillText(label, labelX + 6, labelY - 6);
        ctx.restore();
      });
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(overlay);
    return () => observer.disconnect();
  }, [boardId, currentViewport, elements, presence.boardId, presence.users, selections.boardId, selections.users]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 size-full" />;
}

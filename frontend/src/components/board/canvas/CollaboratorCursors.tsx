"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  clearStaleCursors,
  getCursorSnapshot,
  getPresenceSnapshot,
  getViewportSnapshot,
  subscribeCursors,
  subscribePresence,
  subscribeViewport,
} from "@/collaboration/presenceStore";

export function CollaboratorCursors() {
  const cursors = useSyncExternalStore(subscribeCursors, getCursorSnapshot, getCursorSnapshot);
  const presence = useSyncExternalStore(subscribePresence, getPresenceSnapshot, getPresenceSnapshot);
  const viewport = useSyncExternalStore(subscribeViewport, getViewportSnapshot, getViewportSnapshot);

  useEffect(() => {
    const timer = window.setInterval(() => clearStaleCursors(), 2_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {Object.values(cursors).map((cursor) => {
        const collaborator = presence.users[cursor.userId];
        if (!collaborator) return null;
        const left = cursor.x * viewport.scale + viewport.offsetX;
        const top = cursor.y * viewport.scale + viewport.offsetY;

        return (
          <div
            key={cursor.userId}
            className="absolute left-0 top-0 transition-[left,top] duration-75 ease-linear"
            style={{ left, top, color: collaborator.color }}
          >
            <svg className="block drop-shadow-sm" width="20" height="24" viewBox="0 0 20 24" fill="none">
              <path d="M2 1.5v17l4.7-4.2 3.1 7.1 3.1-1.4-3.1-7.1H16L2 1.5Z" fill="currentColor" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span
              className="ml-3 mt-0.5 block max-w-40 truncate rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.displayName}
            </span>
          </div>
        );
      })}
    </div>
  );
}

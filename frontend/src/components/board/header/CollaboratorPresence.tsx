"use client";

import { useSyncExternalStore } from "react";
import { getPresenceSnapshot, subscribePresence } from "@/collaboration/presenceStore";

export function CollaboratorPresence() {
  const presence = useSyncExternalStore(subscribePresence, getPresenceSnapshot, getPresenceSnapshot);
  const users = presence.connected
    ? [presence.localUser, ...Object.values(presence.users)].filter((user) => user !== null)
    : [];

  if (!users.length) {
    if (!presence.localUser) return null;
    const status = presence.connectionState === "connecting"
      ? "Connecting…"
      : presence.connectionState === "offline" ? "Offline" : "Reconnecting…";
    return <span className="ml-1 text-xs text-slate-500 dark:text-slate-400" role="status">{status}</span>;
  }

  return (
    <div className="ml-1 flex shrink-0 items-center gap-2" aria-label={`${users.length} users online`}>
      <div className="flex -space-x-2" aria-hidden="true">
        {users.slice(0, 4).map((user) => (
          <span
            key={user.userId}
            title={user.displayName}
            className="flex size-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white dark:border-slate-900"
            style={{ backgroundColor: user.color }}
          >
            {user.displayName.slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">{users.length} online</span>
    </div>
  );
}

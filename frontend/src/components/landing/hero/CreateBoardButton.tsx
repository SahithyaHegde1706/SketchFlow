"use client";

import { useState } from "react";
import { createBoard } from "@/collaboration/boards";

export function CreateBoardButton() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    setError(false);
    try {
      const result = await createBoard();
      window.location.assign(result.path);
    } catch {
      setError(true);
      setCreating(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        className="inline-flex items-center gap-1.5 rounded-[12px] bg-teal-600 px-9 py-4.5 text-[17px] font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-wait disabled:opacity-70"
      >
        {creating ? "Creating board…" : "Start Drawing"}
        {!creating && (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        )}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-rose-600">Could not create a board. Check that the backend and database are running.</p>}
    </div>
  );
}

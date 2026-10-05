import type { Collaborator } from "@/collaboration/presenceStore";
import type { FreehandStroke, WhiteboardElement } from "@/types/canvas";
import type { Viewport } from "@/types/geometry";

export type ElementCreatedPayload = { boardId: string; element: WhiteboardElement };
export type ElementDeletedPayload = { boardId: string; elementId: string };
export type FreehandCreatedPayload = { boardId: string; stroke: FreehandStroke; strokeIndex?: number; creationOrderIndex?: number };
export type TextContentUpdatedPayload = { boardId: string; elementId: string; text: string };
export type UserPresencePayload = { boardId: string; user: Collaborator };
export type UserLeftPayload = { boardId: string; userId: string };
export type CursorMovedPayload = { boardId: string; userId: string; x: number; y: number };
export type SelectionChangedPayload = { boardId: string; userId: string; selectedElementIds: string[] };
export type ViewportChangedPayload = { boardId: string; userId: string; viewport: Viewport };

import type { Collaborator } from "@/collaboration/presenceStore";
import type { CanvasSettings } from "@/types/canvas";
import type {
  CursorMovedPayload,
  ElementCreatedPayload,
  ElementDeletedPayload,
  FreehandCreatedPayload,
  SelectionChangedPayload,
  TextContentUpdatedPayload,
  UserLeftPayload,
  UserPresencePayload,
  ViewportChangedPayload,
} from "./boardTypes";

export function isCollaborator(value: unknown): value is Collaborator {
  return typeof value === "object" && value !== null
    && "userId" in value && typeof value.userId === "string" && value.userId.length > 0
    && "displayName" in value && typeof value.displayName === "string"
    && "color" in value && typeof value.color === "string" && /^#[0-9a-fA-F]{6}$/.test(value.color);
}

export function isUserPresencePayload(payload: unknown): payload is UserPresencePayload {
  return typeof payload === "object" && payload !== null
    && "boardId" in payload && typeof payload.boardId === "string"
    && "user" in payload && isCollaborator(payload.user);
}

export function isUserLeftPayload(payload: unknown): payload is UserLeftPayload {
  return typeof payload === "object" && payload !== null
    && "boardId" in payload && typeof payload.boardId === "string"
    && "userId" in payload && typeof payload.userId === "string";
}

export function isCursorMovedPayload(payload: unknown): payload is CursorMovedPayload {
  return typeof payload === "object" && payload !== null
    && "boardId" in payload && typeof payload.boardId === "string"
    && "userId" in payload && typeof payload.userId === "string"
    && "x" in payload && typeof payload.x === "number" && Number.isFinite(payload.x)
    && "y" in payload && typeof payload.y === "number" && Number.isFinite(payload.y);
}

export function isSelectionChangedPayload(payload: unknown): payload is SelectionChangedPayload {
  return typeof payload === "object" && payload !== null
    && "boardId" in payload && typeof payload.boardId === "string"
    && "userId" in payload && typeof payload.userId === "string" && payload.userId.length > 0
    && "selectedElementIds" in payload && Array.isArray(payload.selectedElementIds)
    && payload.selectedElementIds.length <= 500
    && payload.selectedElementIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 128);
}

export function isViewportChangedPayload(payload: unknown): payload is ViewportChangedPayload {
  if (typeof payload !== "object" || payload === null
    || !("boardId" in payload) || typeof payload.boardId !== "string"
    || !("userId" in payload) || typeof payload.userId !== "string"
    || !("viewport" in payload) || typeof payload.viewport !== "object" || payload.viewport === null) return false;
  const viewport = payload.viewport;
  return "offsetX" in viewport && typeof viewport.offsetX === "number" && Number.isFinite(viewport.offsetX)
    && "offsetY" in viewport && typeof viewport.offsetY === "number" && Number.isFinite(viewport.offsetY)
    && "scale" in viewport && typeof viewport.scale === "number" && Number.isFinite(viewport.scale)
    && Math.abs(viewport.offsetX) <= 1_000_000
    && Math.abs(viewport.offsetY) <= 1_000_000
    && viewport.scale >= 0.25 && viewport.scale <= 4;
}

export function isCanvasSettingsPayload(payload: unknown): payload is { boardId: string; canvasSettings: CanvasSettings } {
  if (typeof payload !== "object" || payload === null || !("boardId" in payload) || typeof payload.boardId !== "string" || !("canvasSettings" in payload)) return false;
  const settings = payload.canvasSettings;
  return typeof settings === "object" && settings !== null && !Array.isArray(settings)
    && "backgroundColor" in settings && typeof settings.backgroundColor === "string"
    && "showGrid" in settings && typeof settings.showGrid === "boolean"
    && "gridSize" in settings && typeof settings.gridSize === "number" && Number.isFinite(settings.gridSize)
    && "snapSettings" in settings && typeof settings.snapSettings === "object" && settings.snapSettings !== null;
}

export function isElementCreatedPayload(payload: unknown): payload is ElementCreatedPayload {
  if (typeof payload !== "object" || payload === null || !("boardId" in payload) || !("element" in payload)) {
    return false;
  }

  const element = payload.element;
  return typeof payload.boardId === "string"
    && typeof element === "object"
    && element !== null
    && "id" in element
    && typeof element.id === "string"
    && "type" in element
    && ["rectangle", "roundedRectangle", "circle", "arrow", "line", "text", "image"].includes(String(element.type));
}

export function isElementDeletedPayload(payload: unknown): payload is ElementDeletedPayload {
  return typeof payload === "object"
    && payload !== null
    && "boardId" in payload
    && typeof payload.boardId === "string"
    && "elementId" in payload
    && typeof payload.elementId === "string";
}

export function isFreehandCreatedPayload(payload: unknown): payload is FreehandCreatedPayload {
  if (typeof payload !== "object" || payload === null || !("boardId" in payload) || !("stroke" in payload)) {
    return false;
  }

  const stroke = payload.stroke;
  return typeof payload.boardId === "string"
    && Array.isArray(stroke)
    && stroke.length > 0
    && stroke.every((point) => typeof point === "object"
      && point !== null
      && "x" in point
      && typeof point.x === "number"
      && Number.isFinite(point.x)
      && "y" in point
      && typeof point.y === "number"
      && Number.isFinite(point.y))
    && (!(("strokeIndex" in payload) && payload.strokeIndex !== undefined)
      || (Number.isSafeInteger(payload.strokeIndex) && Number(payload.strokeIndex) >= 0))
    && (!(("creationOrderIndex" in payload) && payload.creationOrderIndex !== undefined)
      || (Number.isSafeInteger(payload.creationOrderIndex) && Number(payload.creationOrderIndex) >= 0));
}

export function isTextContentUpdatedPayload(payload: unknown): payload is TextContentUpdatedPayload {
  return typeof payload === "object"
    && payload !== null
    && "boardId" in payload
    && typeof payload.boardId === "string"
    && "elementId" in payload
    && typeof payload.elementId === "string"
    && "text" in payload
    && typeof payload.text === "string";
}

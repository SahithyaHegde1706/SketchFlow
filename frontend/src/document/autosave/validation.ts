import type { SketchFlowDocumentV1 } from "../types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidDocument(data: unknown): data is SketchFlowDocumentV1 {
  if (!isRecord(data) || data.type !== "sketchflow-document" || data.version !== 1) return false;
  if (data.name !== undefined && typeof data.name !== "string") return false;
  if (!Array.isArray(data.strokes) || !Array.isArray(data.elements) || !Array.isArray(data.groups) || !Array.isArray(data.creationOrder)) return false;
  const strokeCount = data.strokes.length;

  if (!isRecord(data.canvasSettings) || typeof data.canvasSettings.backgroundColor !== "string" || (data.canvasSettings.backgroundMode !== undefined && data.canvasSettings.backgroundMode !== "theme-default" && data.canvasSettings.backgroundMode !== "custom") || typeof data.canvasSettings.showGrid !== "boolean" || !isFiniteNumber(data.canvasSettings.gridSize) || data.canvasSettings.gridSize <= 0) return false;
  const snapSettings = data.canvasSettings.snapSettings;
  if (!isRecord(snapSettings) || typeof snapSettings.enabled !== "boolean" || typeof snapSettings.gridEnabled !== "boolean" || !isFiniteNumber(snapSettings.gridSize) || snapSettings.gridSize <= 0 || !isFiniteNumber(snapSettings.threshold)) return false;

  for (const stroke of data.strokes) {
    if (!Array.isArray(stroke) || !stroke.every((point) => isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y))) return false;
  }

  const elementIds = new Set<string>();
  for (const element of data.elements) {
    if (!isRecord(element) || typeof element.id !== "string" || elementIds.has(element.id)) return false;
    elementIds.add(element.id);
    if (element.rotation !== undefined && !isFiniteNumber(element.rotation)) return false;
    if (element.locked !== undefined && typeof element.locked !== "boolean") return false;

    if (element.type === "rectangle" || element.type === "circle" || element.type === "roundedRectangle" || element.type === "image") {
      if (!isFiniteNumber(element.x) || !isFiniteNumber(element.y) || !isFiniteNumber(element.width) || !isFiniteNumber(element.height)) return false;
      if (element.type === "roundedRectangle" && !isFiniteNumber(element.radius)) return false;
      if (element.type === "image") {
        if (typeof element.src !== "string" || !isFiniteNumber(element.naturalWidth) || !isFiniteNumber(element.naturalHeight)) return false;
        if (element.opacity !== undefined && !isFiniteNumber(element.opacity)) return false;
        if (element.flipX !== undefined && typeof element.flipX !== "boolean") return false;
        if (element.flipY !== undefined && typeof element.flipY !== "boolean") return false;
      }
    } else if (element.type === "line" || element.type === "arrow") {
      if (!isFiniteNumber(element.startX) || !isFiniteNumber(element.startY) || !isFiniteNumber(element.endX) || !isFiniteNumber(element.endY)) return false;
    } else if (element.type === "text") {
      if (!isFiniteNumber(element.x) || !isFiniteNumber(element.y) || typeof element.text !== "string" || !isFiniteNumber(element.fontSize)) return false;
    } else {
      return false;
    }
  }

  const groupIds = new Set<string>();
  for (const group of data.groups) {
    if (!isRecord(group) || typeof group.id !== "string" || groupIds.has(group.id) || !Array.isArray(group.elementIds)) return false;
    groupIds.add(group.id);
    if (group.locked !== undefined && typeof group.locked !== "boolean") return false;
    if (!group.elementIds.every((id) => typeof id === "string" && elementIds.has(id))) return false;
  }

  return data.creationOrder.every((record) => {
    if (!isRecord(record)) return false;
    if (record.kind === "stroke") {
      return Number.isInteger(record.index) && (record.index as number) >= 0 && (record.index as number) < strokeCount;
    }
    return record.kind === "element" && typeof record.id === "string" && elementIds.has(record.id);
  });
}


import type { FreehandStroke, WhiteboardElement, Group, SelectionSet } from "@/types/canvas";
import { rotatePoint } from "@/canvas/geometry/geometry";

export function getElementCenter(element: WhiteboardElement): { x: number; y: number } {
  if (element.type === "arrow" || element.type === "line") {
    return {
      x: (element.startX + element.endX) / 2,
      y: (element.startY + element.endY) / 2,
    };
  }
  if (element.type === "text") {
    // We approximate the text visual center, using the x/y of the text base, offset by half fontSize
    return {
      x: element.x, // not perfectly centered horizontally, but consistent
      y: element.y - element.fontSize / 2,
    };
  }
  return {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
}

export function rotateElement(
  target: WhiteboardElement,
  original: WhiteboardElement,
  deltaAngle: number,
  orbitCenter: { x: number; y: number }
) {
  const origCenter = getElementCenter(original);
  const newCenter = rotatePoint(origCenter, orbitCenter, deltaAngle);
  const dx = newCenter.x - origCenter.x;
  const dy = newCenter.y - origCenter.y;

  if ((target.type === "arrow" || target.type === "line") && (original.type === "arrow" || original.type === "line")) {
    // Arrow and line endpoints need to orbit the main orbitCenter!
    const newStart = rotatePoint({ x: original.startX, y: original.startY }, orbitCenter, deltaAngle);
    const newEnd = rotatePoint({ x: original.endX, y: original.endY }, orbitCenter, deltaAngle);
    target.startX = newStart.x;
    target.startY = newStart.y;
    target.endX = newEnd.x;
    target.endY = newEnd.y;
    target.rotation = (original.rotation || 0) + deltaAngle;
  } else if (target.type !== "arrow" && target.type !== "line" && original.type !== "arrow" && original.type !== "line") {
    target.x = original.x + dx;
    target.y = original.y + dy;
    target.rotation = (original.rotation || 0) + deltaAngle;
  }
}

export function rotateStroke(
  target: FreehandStroke,
  original: FreehandStroke,
  deltaAngle: number,
  orbitCenter: { x: number; y: number }
) {
  target.splice(
    0,
    target.length,
    ...original.map(point => rotatePoint(point, orbitCenter, deltaAngle))
  );
}

export function applyRotation(
  selections: SelectionSet,
  originals: (FreehandStroke | WhiteboardElement | Group)[],
  originalElementsSnapshot: WhiteboardElement[],
  deltaAngle: number,
  orbitCenter: { x: number; y: number },
  elements: WhiteboardElement[]
) {
  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];
    const original = originals[i];

    if (!selection || !original) continue;

    if (selection.kind === "stroke" && Array.isArray(original)) {
      rotateStroke(selection.value, original, deltaAngle, orbitCenter);
    } else if (selection.kind === "element" && !Array.isArray(original) && !("elementIds" in original)) {
      rotateElement(selection.value, original, deltaAngle, orbitCenter);
    } else if (selection.kind === "group" && !Array.isArray(original) && ("elementIds" in original)) {
      for (const id of original.elementIds) {
        const targetElement = elements.find(e => e.id === id);
        const origElement = originalElementsSnapshot.find(e => e.id === id);
        if (targetElement && origElement) {
          rotateElement(targetElement, origElement, deltaAngle, orbitCenter);
        }
      }
    }
  }
}

import type {
  AlignmentGuide,
  Bounds,
  FreehandStroke,
  Group,
  Selection,
  SelectionSet,
  SnapSettings,
  Viewport,
  WhiteboardElement,
} from "@/types/canvas";
import { getSelectionBounds } from "@/canvas/selection";

export type SnapResult = {
  snappedDeltaX: number;
  snappedDeltaY: number;
  guides: AlignmentGuide[];
};

type SnapCandidateX = {
  movingRefX: number;
  targetX: number;
  snapOffset: number;
  dist: number;
  priority: number;
  targetBounds?: Bounds;
  isCanvasCenter?: boolean;
};

type SnapCandidateY = {
  movingRefY: number;
  targetY: number;
  snapOffset: number;
  dist: number;
  priority: number;
  targetBounds?: Bounds;
  isCanvasCenter?: boolean;
};

export function calculateSnap(
  context: CanvasRenderingContext2D,
  movingSelections: SelectionSet,
  elements: WhiteboardElement[],
  strokes: FreehandStroke[],
  groups: Group[],
  originalBounds: Bounds,
  rawDeltaX: number,
  rawDeltaY: number,
  viewport: Viewport,
  canvasDimensions: { width: number; height: number },
  snapSettings: SnapSettings,
): SnapResult {
  if (!snapSettings.enabled) {
    return {
      snappedDeltaX: rawDeltaX,
      snappedDeltaY: rawDeltaY,
      guides: [],
    };
  }

  const threshold = snapSettings.threshold;

  // Un-snapped bounds of moving selection
  const movingLeft = originalBounds.left + rawDeltaX;
  const movingTop = originalBounds.top + rawDeltaY;
  const movingRight = originalBounds.right + rawDeltaX;
  const movingBottom = originalBounds.bottom + rawDeltaY;
  const movingCenterX = (movingLeft + movingRight) / 2;
  const movingCenterY = (movingTop + movingBottom) / 2;

  // Visible canvas bounds in logical coordinates
  const canvasLeft = -viewport.offsetX / viewport.scale;
  const canvasTop = -viewport.offsetY / viewport.scale;
  const canvasRight = (canvasDimensions.width - viewport.offsetX) / viewport.scale;
  const canvasBottom = (canvasDimensions.height - viewport.offsetY) / viewport.scale;
  const canvasCenterX = (canvasLeft + canvasRight) / 2;
  const canvasCenterY = (canvasTop + canvasBottom) / 2;

  // Determine unselected items for object snapping
  const movingElementIds = new Set(
    movingSelections.flatMap((s) => {
      if (s.kind === "element") return [s.value.id];
      if (s.kind === "group") return s.value.elementIds;
      return [];
    }),
  );
  const movingStrokes = new Set(
    movingSelections.filter((s): s is Extract<Selection, { kind: "stroke" }> => s.kind === "stroke").map((s) => s.value),
  );
  const movingGroups = new Set(
    movingSelections.filter((s): s is Extract<Selection, { kind: "group" }> => s.kind === "group").map((s) => s.value.id),
  );

  const unselectedBoundsList: Bounds[] = [];

  for (const element of elements) {
    if (!movingElementIds.has(element.id)) {
      unselectedBoundsList.push(getSelectionBounds(context, { kind: "element", value: element }, elements));
    }
  }
  for (const stroke of strokes) {
    if (!movingStrokes.has(stroke)) {
      unselectedBoundsList.push(getSelectionBounds(context, { kind: "stroke", value: stroke }, elements));
    }
  }
  for (const group of groups) {
    if (!movingGroups.has(group.id) && !group.elementIds.some((id) => movingElementIds.has(id))) {
      unselectedBoundsList.push(getSelectionBounds(context, { kind: "group", value: group }, elements));
    }
  }

  // --- X-Axis Snapping ---
  const candidatesX: SnapCandidateX[] = [];

  // 1. Object Snapping (X)
  for (const targetB of unselectedBoundsList) {
    const targetCenter = (targetB.left + targetB.right) / 2;
    const targetXList = [
      { x: targetB.left, priority: 1 },
      { x: targetCenter, priority: 0 },
      { x: targetB.right, priority: 1 },
    ];
    const movingXList = [movingLeft, movingCenterX, movingRight];

    for (const movingRefX of movingXList) {
      for (const targetItem of targetXList) {
        const offset = targetItem.x - movingRefX;
        const dist = Math.abs(offset);
        if (dist <= threshold) {
          candidatesX.push({
            movingRefX,
            targetX: targetItem.x,
            snapOffset: offset,
            dist,
            priority: targetItem.priority,
            targetBounds: targetB,
          });
        }
      }
    }
  }

  // 2. Canvas Center Snapping (X)
  for (const movingRefX of [movingLeft, movingCenterX, movingRight]) {
    const offset = canvasCenterX - movingRefX;
    const dist = Math.abs(offset);
    if (dist <= threshold) {
      candidatesX.push({
        movingRefX,
        targetX: canvasCenterX,
        snapOffset: offset,
        dist,
        priority: 2,
        isCanvasCenter: true,
      });
    }
  }

  // 3. Grid Snapping (X)
  if (snapSettings.gridEnabled && snapSettings.gridSize > 0) {
    const gSize = snapSettings.gridSize;
    for (const movingRefX of [movingLeft, movingCenterX, movingRight]) {
      const nearestGridX = Math.round(movingRefX / gSize) * gSize;
      const offset = nearestGridX - movingRefX;
      const dist = Math.abs(offset);
      if (dist <= threshold) {
        candidatesX.push({
          movingRefX,
          targetX: nearestGridX,
          snapOffset: offset,
          dist,
          priority: 3,
        });
      }
    }
  }

  // Pick best candidate X
  let bestX: SnapCandidateX | null = null;
  if (candidatesX.length > 0) {
    candidatesX.sort((a, b) => {
      if (Math.abs(a.dist - b.dist) > 0.001) return a.dist - b.dist;
      return a.priority - b.priority;
    });
    bestX = candidatesX[0]!;
  }

  // --- Y-Axis Snapping ---
  const candidatesY: SnapCandidateY[] = [];

  // 1. Object Snapping (Y)
  for (const targetB of unselectedBoundsList) {
    const targetCenter = (targetB.top + targetB.bottom) / 2;
    const targetYList = [
      { y: targetB.top, priority: 1 },
      { y: targetCenter, priority: 0 },
      { y: targetB.bottom, priority: 1 },
    ];
    const movingYList = [movingTop, movingCenterY, movingBottom];

    for (const movingRefY of movingYList) {
      for (const targetItem of targetYList) {
        const offset = targetItem.y - movingRefY;
        const dist = Math.abs(offset);
        if (dist <= threshold) {
          candidatesY.push({
            movingRefY,
            targetY: targetItem.y,
            snapOffset: offset,
            dist,
            priority: targetItem.priority,
            targetBounds: targetB,
          });
        }
      }
    }
  }

  // 2. Canvas Center Snapping (Y)
  for (const movingRefY of [movingTop, movingCenterY, movingBottom]) {
    const offset = canvasCenterY - movingRefY;
    const dist = Math.abs(offset);
    if (dist <= threshold) {
      candidatesY.push({
        movingRefY,
        targetY: canvasCenterY,
        snapOffset: offset,
        dist,
        priority: 2,
        isCanvasCenter: true,
      });
    }
  }

  // 3. Grid Snapping (Y)
  if (snapSettings.gridEnabled && snapSettings.gridSize > 0) {
    const gSize = snapSettings.gridSize;
    for (const movingRefY of [movingTop, movingCenterY, movingBottom]) {
      const nearestGridY = Math.round(movingRefY / gSize) * gSize;
      const offset = nearestGridY - movingRefY;
      const dist = Math.abs(offset);
      if (dist <= threshold) {
        candidatesY.push({
          movingRefY,
          targetY: nearestGridY,
          snapOffset: offset,
          dist,
          priority: 3,
        });
      }
    }
  }

  // Pick best candidate Y
  let bestY: SnapCandidateY | null = null;
  if (candidatesY.length > 0) {
    candidatesY.sort((a, b) => {
      if (Math.abs(a.dist - b.dist) > 0.001) return a.dist - b.dist;
      return a.priority - b.priority;
    });
    bestY = candidatesY[0]!;
  }

  const snappedDeltaX = bestX ? rawDeltaX + bestX.snapOffset : rawDeltaX;
  const snappedDeltaY = bestY ? rawDeltaY + bestY.snapOffset : rawDeltaY;

  const finalMovingTop = originalBounds.top + snappedDeltaY;
  const finalMovingBottom = originalBounds.bottom + snappedDeltaY;
  const finalMovingLeft = originalBounds.left + snappedDeltaX;
  const finalMovingRight = originalBounds.right + snappedDeltaX;

  const guides: AlignmentGuide[] = [];

  if (bestX) {
    if (bestX.isCanvasCenter) {
      guides.push({
        type: "vertical",
        position: bestX.targetX,
        start: canvasTop,
        end: canvasBottom,
      });
    } else if (bestX.targetBounds) {
      const start = Math.min(finalMovingTop, bestX.targetBounds.top) - 16;
      const end = Math.max(finalMovingBottom, bestX.targetBounds.bottom) + 16;
      guides.push({
        type: "vertical",
        position: bestX.targetX,
        start,
        end,
      });
    }
  }

  if (bestY) {
    if (bestY.isCanvasCenter) {
      guides.push({
        type: "horizontal",
        position: bestY.targetY,
        start: canvasLeft,
        end: canvasRight,
      });
    } else if (bestY.targetBounds) {
      const start = Math.min(finalMovingLeft, bestY.targetBounds.left) - 16;
      const end = Math.max(finalMovingRight, bestY.targetBounds.right) + 16;
      guides.push({
        type: "horizontal",
        position: bestY.targetY,
        start,
        end,
      });
    }
  }

  return {
    snappedDeltaX,
    snappedDeltaY,
    guides,
  };
}

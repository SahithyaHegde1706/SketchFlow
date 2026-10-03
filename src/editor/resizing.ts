import type { Bounds, FreehandStroke, ResizeHandle, Selection, WhiteboardElement } from "@/types/canvas";
import { getBounds, getStrokeBounds } from "@/canvas/geometry/geometry";
import { getSelectionBounds } from "@/canvas/interaction/selection";

export function resizeSelection(
  selection: Selection,
  original: FreehandStroke | WhiteboardElement,
  deltaX: number,
  deltaY: number,
  handle: ResizeHandle,
  context?: CanvasRenderingContext2D,
) {
  if (selection.kind === "stroke" && Array.isArray(original)) {
    const originalBounds = getStrokeBounds(original);
    let newLeft = originalBounds.left;
    let newTop = originalBounds.top;
    let newRight = originalBounds.right;
    let newBottom = originalBounds.bottom;

    if (handle.includes("left")) {
      newLeft = originalBounds.left + deltaX;
    } else if (handle.includes("right")) {
      newRight = originalBounds.right + deltaX;
    }
    if (handle.includes("top")) {
      newTop = originalBounds.top + deltaY;
    } else if (handle.includes("bottom")) {
      newBottom = originalBounds.bottom + deltaY;
    }

    const origWidth = Math.max(0.001, originalBounds.right - originalBounds.left);
    const origHeight = Math.max(0.001, originalBounds.bottom - originalBounds.top);

    let scaleX = (newRight - newLeft) / origWidth;
    let scaleY = (newBottom - newTop) / origHeight;

    if (Math.abs(scaleX) < 0.01) scaleX = 0.01 * (scaleX < 0 ? -1 : 1);
    if (Math.abs(scaleY) < 0.01) scaleY = 0.01 * (scaleY < 0 ? -1 : 1);

    selection.value.splice(
      0,
      selection.value.length,
      ...original.map((point) => ({
        x: newLeft + (point.x - originalBounds.left) * scaleX,
        y: newTop + (point.y - originalBounds.top) * scaleY,
      })),
    );
    return;
  }

  if (selection.kind !== "element" || Array.isArray(original)) {
    return;
  }

  if (selection.value.type === "image" && original.type === "image") {
    const resizeLeft = handle.includes("left");
    const resizeTop = handle.includes("top");
    const anchorX = resizeLeft ? original.x + original.width : original.x;
    const anchorY = resizeTop ? original.y + original.height : original.y;
    const horizontalDirection = resizeLeft ? -1 : 1;
    const verticalDirection = resizeTop ? -1 : 1;

    let width = Math.max(1, original.width + horizontalDirection * deltaX);
    let height = Math.max(1, original.height + verticalDirection * deltaY);

    if (original.maintainAspectRatio !== false) {
      const aspectRatio = original.width / original.height;
      const widthChange = Math.abs(width - original.width) / original.width;
      const heightChange = Math.abs(height - original.height) / original.height;

      if (widthChange >= heightChange) {
        height = Math.max(1, width / aspectRatio);
      } else {
        width = Math.max(1, height * aspectRatio);
      }
    }

    selection.value.width = width;
    selection.value.height = height;
    selection.value.x = resizeLeft ? anchorX - width : anchorX;
    selection.value.y = resizeTop ? anchorY - height : anchorY;
  } else if (
    (selection.value.type === "rectangle" && original.type === "rectangle") ||
    (selection.value.type === "roundedRectangle" && original.type === "roundedRectangle") ||
    (selection.value.type === "circle" && original.type === "circle")
  ) {
    let newLeft = original.x;
    let newTop = original.y;
    let newRight = original.x + original.width;
    let newBottom = original.y + original.height;

    if (handle.includes("left")) {
      newLeft = original.x + deltaX;
    } else if (handle.includes("right")) {
      newRight = original.x + original.width + deltaX;
    }
    if (handle.includes("top")) {
      newTop = original.y + deltaY;
    } else if (handle.includes("bottom")) {
      newBottom = original.y + original.height + deltaY;
    }

    selection.value.x = Math.min(newLeft, newRight);
    selection.value.y = Math.min(newTop, newBottom);
    selection.value.width = Math.max(1, Math.abs(newRight - newLeft));
    selection.value.height = Math.max(1, Math.abs(newBottom - newTop));
    
    if (selection.value.type === "roundedRectangle" && original.type === "roundedRectangle") {
      selection.value.radius = Math.min(original.radius, Math.min(selection.value.width, selection.value.height) / 2);
    }
  } else if ((selection.value.type === "arrow" || selection.value.type === "line") && (original.type === "arrow" || original.type === "line")) {
    let origBounds: Bounds;
    if (context) {
      origBounds = getSelectionBounds(context, { kind: "element", value: original });
    } else {
      origBounds = getBounds([
        { x: original.startX, y: original.startY },
        { x: original.endX, y: original.endY },
      ]);
    }

    let nLeft = origBounds.left;
    let nTop = origBounds.top;
    let nRight = origBounds.right;
    let nBottom = origBounds.bottom;

    if (handle.includes("left")) {
      nLeft = origBounds.left + deltaX;
    } else if (handle.includes("right")) {
      nRight = origBounds.right + deltaX;
    }
    if (handle.includes("top")) {
      nTop = origBounds.top + deltaY;
    } else if (handle.includes("bottom")) {
      nBottom = origBounds.bottom + deltaY;
    }

    const origWidth = Math.max(0.001, origBounds.right - origBounds.left);
    const origHeight = Math.max(0.001, origBounds.bottom - origBounds.top);

    let scaleX = (nRight - nLeft) / origWidth;
    let scaleY = (nBottom - nTop) / origHeight;

    if (Math.abs(scaleX) < 0.01) scaleX = 0.01 * (scaleX < 0 ? -1 : 1);
    if (Math.abs(scaleY) < 0.01) scaleY = 0.01 * (scaleY < 0 ? -1 : 1);

    selection.value.startX = nLeft + (original.startX - origBounds.left) * scaleX;
    selection.value.startY = nTop + (original.startY - origBounds.top) * scaleY;
    selection.value.endX = nLeft + (original.endX - origBounds.left) * scaleX;
    selection.value.endY = nTop + (original.endY - origBounds.top) * scaleY;
  } else if (selection.value.type === "text" && original.type === "text") {
    let origBounds: Bounds;
    if (context) {
      origBounds = getSelectionBounds(context, { kind: "element", value: original });
    } else {
      origBounds = {
        left: original.x,
        top: original.y - original.fontSize,
        right: original.x + 20,
        bottom: original.y,
      };
    }

    let nLeft = origBounds.left;
    let nTop = origBounds.top;
    let nBottom = origBounds.bottom;

    if (handle.includes("left")) {
      nLeft = origBounds.left + deltaX;
    }
    if (handle.includes("top")) {
      nTop = origBounds.top + deltaY;
    } else if (handle.includes("bottom")) {
      nBottom = origBounds.bottom + deltaY;
    }

    nBottom = Math.max(nTop + 1, nBottom);

    const origHeight = Math.max(0.001, origBounds.bottom - origBounds.top);
    const scaleY = (nBottom - nTop) / origHeight;
    const newFontSize = Math.max(8, original.fontSize * scaleY);

    selection.value.fontSize = newFontSize;

    if (handle.includes("left")) {
      selection.value.x = nLeft;
    } else {
      selection.value.x = original.x;
    }

    if (handle.includes("top")) {
      selection.value.y = original.y;
    } else {
      selection.value.y = origBounds.top + newFontSize;
    }
  }
}

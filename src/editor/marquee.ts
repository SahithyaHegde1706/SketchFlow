import type { Bounds, CreationRecord, Group, MarqueeState, SelectionSet, WhiteboardElement } from "@/types/canvas";
import { getSelectionBounds } from "@/canvas/selection";

/**
 * Minimum logical-coordinate movement (in either axis) required to treat a
 * pointer gesture as a marquee drag rather than a click.
 *
 * Below this threshold, pointerup on empty canvas behaves like a click
 * (clears the selection) rather than creating an empty marquee.
 */
export const MIN_MARQUEE_DISTANCE = 4;

/**
 * Convert a raw MarqueeState (start + current pointer positions) into a
 * normalized axis-aligned Bounds.
 *
 * Normalizing ensures that dragging in all four directions produces the same
 * correct bounding box regardless of which corner the user started from.
 */
export function normalizeMarqueeBounds(state: MarqueeState): Bounds {
  return {
    left: Math.min(state.startX, state.currentX),
    top: Math.min(state.startY, state.currentY),
    right: Math.max(state.startX, state.currentX),
    bottom: Math.max(state.startY, state.currentY),
  };
}

/**
 * Returns true when itemBounds is COMPLETELY inside marqueeBounds.
 *
 * A partially-overlapping item does NOT qualify — the item must be fully
 * enclosed on all four sides.
 */
export function isFullyContained(itemBounds: Bounds, marqueeBounds: Bounds): boolean {
  return (
    itemBounds.left >= marqueeBounds.left &&
    itemBounds.top >= marqueeBounds.top &&
    itemBounds.right <= marqueeBounds.right &&
    itemBounds.bottom <= marqueeBounds.bottom
  );
}

/**
 * Collect all selection units that are FULLY contained within marqueeBounds.
 *
 * Rules:
 *
 * 1. Freehand strokes — use their axis-aligned bounding box.
 *
 * 2. Elements that belong to a group — treat the entire group as a single
 *    selection unit. The group qualifies only when the union of ALL its
 *    members' visual bounds fits inside the marquee. Once a group ID is
 *    processed, all subsequent creationOrder records that share that group
 *    are skipped to avoid double-adding.
 *
 * 3. Elements NOT in any group — use their rotated visual bounds (axis-
 *    aligned bounding box of the rotated corners). This is what
 *    `getSelectionBounds` already returns, which matches the selection
 *    highlight shown in the UI.
 *
 * The function never returns both a group AND one of its members.
 * It preserves creation order among the returned items.
 *
 * @param context   A 2D rendering context (needed for text-bounds measurement).
 * @param marqueeBounds   Normalized marquee rectangle in logical coordinates.
 * @param creationOrder   The canonical ordered list of all drawable items.
 * @param elements        All whiteboard elements (needed for group-bounds calc).
 * @param groups          All group definitions.
 */
export function getMarqueeSelections(
  context: CanvasRenderingContext2D,
  marqueeBounds: Bounds,
  creationOrder: CreationRecord[],
  elements: WhiteboardElement[],
  groups: Group[],
): SelectionSet {
  const result: SelectionSet = [];

  // Track which groups and elements we've already evaluated so each item is
  // considered at most once, preserving correct group semantics.
  const seenGroupIds = new Set<string>();
  const seenElementIds = new Set<string>();
  // Strokes have no id; track by object reference.
  const seenStrokes = new WeakSet<object>();

  for (const record of creationOrder) {
    if (record.kind === "stroke") {
      if (seenStrokes.has(record.value)) continue;
      seenStrokes.add(record.value);

      const bounds = getSelectionBounds(context, record, elements);
      if (isFullyContained(bounds, marqueeBounds)) {
        result.push({ kind: "stroke", value: record.value });
      }
    } else {
      // Determine whether this element is part of a group.
      const group = groups.find((g) => g.elementIds.includes(record.value.id));

      if (group) {
        // Skip if we have already evaluated this group.
        if (seenGroupIds.has(group.id)) continue;
        seenGroupIds.add(group.id);

        // Use the group's combined visual bounds (all member elements).
        const groupSelection = { kind: "group" as const, value: group };
        const bounds = getSelectionBounds(context, groupSelection, elements);
        if (isFullyContained(bounds, marqueeBounds)) {
          result.push(groupSelection);
        }
        // Whether the group qualified or not, do NOT also add individual members.
      } else {
        if (seenElementIds.has(record.value.id)) continue;
        seenElementIds.add(record.value.id);

        const bounds = getSelectionBounds(context, record, elements);
        if (isFullyContained(bounds, marqueeBounds)) {
          result.push({ kind: "element", value: record.value });
        }
      }
    }
  }

  return result;
}

/**
 * Combine an existing base selection set with new marquee selections (Shift + marquee).
 *
 * All items in `base` remain selected. Any item in `additions` that is not already
 * present in `base` is appended. Items are never toggled off.
 */
export function unionSelections(base: SelectionSet, additions: SelectionSet): SelectionSet {
  const result = [...base];
  for (const add of additions) {
    const exists = result.some(item => (
      item.kind === add.kind && (
        item.value === add.value ||
        (item.kind === "element" && add.kind === "element" && item.value.id === add.value.id) ||
        (item.kind === "group" && add.kind === "group" && item.value.id === add.value.id)
      )
    ));
    if (!exists) {
      result.push(add);
    }
  }
  return result;
}


import type { FreehandStroke, Group, WhiteboardElement } from "@/types/canvas";
import type { Selection, SelectionSet } from "@/types/editor";

export function isItemLocked(
  item: Selection | FreehandStroke | WhiteboardElement | Group,
  elements: WhiteboardElement[] = [],
): boolean {
  if ("kind" in item) {
    if (item.kind === "stroke") {
      return Boolean(item.value.locked);
    }
    if (item.kind === "element") {
      return Boolean(item.value.locked);
    }
    if (item.kind === "group") {
      if (item.value.locked) return true;
      return item.value.elementIds.some(id => {
        const el = elements.find(e => e.id === id);
        return el?.locked;
      });
    }
  }

  if ("elementIds" in item) {
    // Group object directly
    if (item.locked) return true;
    return item.elementIds.some(id => {
      const el = elements.find(e => e.id === id);
      return el?.locked;
    });
  }

  // WhiteboardElement or FreehandStroke
  return Boolean(item.locked);
}

export function isAnySelectionLocked(
  selections: SelectionSet,
  elements: WhiteboardElement[] = [],
): boolean {
  return selections.some(sel => isItemLocked(sel, elements));
}

export function setSelectionLock(
  selections: SelectionSet,
  elements: WhiteboardElement[],
  targetLocked: boolean,
): boolean {
  let changed = false;

  for (const selection of selections) {
    if (selection.kind === "stroke") {
      if (Boolean(selection.value.locked) !== targetLocked) {
        selection.value.locked = targetLocked;
        changed = true;
      }
    } else if (selection.kind === "element") {
      if (Boolean(selection.value.locked) !== targetLocked) {
        selection.value.locked = targetLocked;
        changed = true;
      }
    } else if (selection.kind === "group") {
      if (Boolean(selection.value.locked) !== targetLocked) {
        selection.value.locked = targetLocked;
        changed = true;
      }
      // When unlocking a group, unlock member elements if unlocking.
      // When locking a group, set group.locked = true without overwriting member states.
      if (!targetLocked) {
        for (const id of selection.value.elementIds) {
          const element = elements.find(e => e.id === id);
          if (element && element.locked) {
            element.locked = false;
            changed = true;
          }
        }
      }
    }
  }

  return changed;
}

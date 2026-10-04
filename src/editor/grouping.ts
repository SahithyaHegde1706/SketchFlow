import type { Group, WhiteboardElement } from "@/types/canvas";
import type { Selection, SelectionSet } from "@/types/editor";

export function getSelectedGroups(selection: SelectionSet): Group[] {
  return selection
    .filter((item): item is Extract<Selection, { kind: "group" }> => item.kind === "group")
    .map(item => item.value);
}

export function getGroupForElement(groups: Group[], elementId: string): Group | undefined {
  return groups.find(group => group.elementIds.includes(elementId));
}

export function groupSelection(
  selection: SelectionSet,
  elements: WhiteboardElement[],
  groups: Group[],
): Group | null {
  const elementIds = selection
    .filter((item): item is Extract<Selection, { kind: "element" }> => item.kind === "element")
    .map(item => item.value.id)
    .filter((id, index, ids) => ids.indexOf(id) === index);

  if (elementIds.length < 2 || elementIds.some(elemId => !elements.some(element => element.id === elemId))) {
    return null;
  }

  if (elementIds.some(elemId => getGroupForElement(groups, elemId))) {
    return null;
  }

  const group: Group = { id: crypto.randomUUID(), elementIds };
  groups.push(group);
  return group;
}

export function ungroupSelection(selection: SelectionSet, groups: Group[]): string[] {
  const selectedIds = new Set(getSelectedGroups(selection).map(group => group.id));
  if (selectedIds.size === 0) return [];

  const ungroupedElementIds = groups
    .filter(group => selectedIds.has(group.id))
    .flatMap(group => group.elementIds);
  groups.splice(0, groups.length, ...groups.filter(group => !selectedIds.has(group.id)));
  return ungroupedElementIds;
}

export function removeElementFromGroups(elementId: string, groups: Group[]): void {
  for (const group of groups) {
    group.elementIds = group.elementIds.filter(id => id !== elementId);
  }
  dissolveEmptyGroups(groups);
}

export function dissolveEmptyGroups(groups: Group[]): void {
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    if (groups[index]!.elementIds.length < 2) {
      groups.splice(index, 1);
    }
  }
}
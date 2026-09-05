import type { Tool } from "@/types/canvas";

const toolShortcuts: Record<string, Tool> = {
  v: "select",
  h: "hand",
  r: "rectangle",
  o: "circle",
  a: "arrow",
  t: "text",
  p: "draw",
  e: "eraser",
};

export function getToolForShortcut(key: string): Tool | null {
  return toolShortcuts[key.toLowerCase()] ?? null;
}

export function isTextEditingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function hasShortcutModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}
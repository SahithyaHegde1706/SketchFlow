import type { CanvasSettings } from "@/types/canvas";

export const DEFAULT_DOCUMENT_NAME = "Untitled board";

const LIGHT_BACKGROUND = "#f8fafc";
const DARK_BACKGROUND = "#0f172a";

/** Create a fresh document's canvas settings while keeping the background in sync with app theme. */
export function createDefaultCanvasSettings(theme: "light" | "dark"): CanvasSettings {
  return {
    backgroundColor: theme === "dark" ? DARK_BACKGROUND : LIGHT_BACKGROUND,
    backgroundMode: "theme-default",
    showGrid: false,
    gridSize: 16,
    snapSettings: {
      enabled: true,
      gridEnabled: false,
      gridSize: 16,
      threshold: 6,
    },
  };
}

export function isDefaultDocumentBackground(color: string): boolean {
  return color === LIGHT_BACKGROUND || color === DARK_BACKGROUND;
}

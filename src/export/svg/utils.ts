let cachedMeasureContext: CanvasRenderingContext2D | null = null;

export function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!cachedMeasureContext) {
    const canvas = document.createElement("canvas");
    cachedMeasureContext = canvas.getContext("2d");
  }
  return cachedMeasureContext;
}

export function f(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function svgFill(color: string | null | undefined): string {
  if (!color || color === "transparent" || color === "none") return "none";
  return escAttr(color);
}

export function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


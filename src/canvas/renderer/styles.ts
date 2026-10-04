export const STROKE_COLOR = "#0f172a";
export const STROKE_COLOR_DARK = "#e2e8f0";
export const STROKE_WIDTH = 3;
export const TEXT_FONT_SIZE = 20;

export function isDarkColor(color: string): boolean {
  const hex = color.replace('#', '');

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance using the standard formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

  return luminance < 128;
}

export function getAdaptiveStrokeColor(backgroundColor: string): string {
  return isDarkColor(backgroundColor) ? STROKE_COLOR_DARK : STROKE_COLOR;
}
  
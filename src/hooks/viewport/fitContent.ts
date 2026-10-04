import type { FreehandStroke, WhiteboardElement } from "@/types/canvas";
import type { Point, Viewport } from "@/types/geometry";

type CanvasRef = { current: HTMLCanvasElement | null };

export function fitContentToScreen(
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  fillRatio: number,
  canvasRef: CanvasRef,
  viewportRef: { current: Viewport },
  onViewportChange: ((viewport: Viewport) => void) | undefined,
  setZoom: (zoom: number) => void,
  drawCanvas: () => void,
  shouldDraw = false,
) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const checkPoint = (point: Point) => {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  };

  for (const stroke of strokes) stroke.forEach(checkPoint);
  for (const element of elements) {
    const startX = "x" in element ? element.x : element.startX;
    const startY = "y" in element ? element.y : element.startY;
    checkPoint({ x: startX, y: startY });
    if (element.type === "rectangle" || element.type === "roundedRectangle" || element.type === "circle") {
      checkPoint({ x: element.x + element.width, y: element.y + element.height });
    } else if (element.type === "line" || element.type === "arrow") {
      checkPoint({ x: element.endX, y: element.endY });
    }
  }

  const canvas = canvasRef.current;
  if (minX !== Infinity && canvas) {
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = (canvasRect.width * fillRatio) / Math.max(boundsWidth, 1);
    const scaleY = (canvasRect.height * fillRatio) / Math.max(boundsHeight, 1);
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 2);
    const centerX = minX + boundsWidth / 2;
    const centerY = minY + boundsHeight / 2;

    viewportRef.current = {
      scale: newScale,
      offsetX: canvasRect.width / 2 - centerX * newScale,
      offsetY: canvasRect.height / 2 - centerY * newScale,
    };
    onViewportChange?.(viewportRef.current);
    setZoom(newScale);
    if (shouldDraw) drawCanvas();
  }
}

import type { ImageElement } from "@/types/canvas";
import type { CropState } from "@/types/editor";

export function getCropLocalCoordinates(
  x: number,
  y: number,
  element: ImageElement
): { x: number; y: number } {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;

  const dx = x - cx;
  const dy = y - cy;

  const angle = -(element.rotation || 0);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const localX = dx * cos - dy * sin + element.width / 2;
  const localY = dx * sin + dy * cos + element.height / 2;

  return { x: localX, y: localY };
}

export async function applyCrop(state: CropState): Promise<ImageElement> {
  const { element, left, top, right, bottom } = state;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = element.src;
  });

  const scaleX = img.naturalWidth / element.width;
  const scaleY = img.naturalHeight / element.height;

  const cropW = right - left;
  const cropH = bottom - top;

  const sourceX = left * scaleX;
  const sourceY = top * scaleY;
  const sourceW = cropW * scaleX;
  const sourceH = cropH * scaleY;

  const canvas = document.createElement("canvas");
  canvas.width = sourceW;
  canvas.height = sourceH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
  const dataUrl = canvas.toDataURL("image/png");

  const localCenterX = left + cropW / 2;
  const localCenterY = top + cropH / 2;

  const elLocalCX = element.width / 2;
  const elLocalCY = element.height / 2;

  const offX = localCenterX - elLocalCX;
  const offY = localCenterY - elLocalCY;

  const angle = element.rotation || 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const globalOffX = offX * cos - offY * sin;
  const globalOffY = offX * sin + offY * cos;

  const newCX = element.x + element.width / 2 + globalOffX;
  const newCY = element.y + element.height / 2 + globalOffY;

  return {
    ...element,
    src: dataUrl,
    x: newCX - cropW / 2,
    y: newCY - cropH / 2,
    width: cropW,
    height: cropH,
    naturalWidth: sourceW,
    naturalHeight: sourceH,
    initialWidth: cropW,
    initialHeight: cropH,
  };
}

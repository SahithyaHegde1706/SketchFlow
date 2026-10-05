import type { WhiteboardElement } from "@/types/canvas";
import { rotateAttr } from "./transforms";
import { escAttr, f } from "./utils";

export function imageToSvg(
  el: Extract<WhiteboardElement, { type: "image" }>,
  ox: number,
  oy: number,
): string {
  const rot = rotateAttr(el, ox, oy);
  if (el.type === "image") {
    // Apply flip and rotation together about the image center on one group.
    const opacityAttr = el.opacity !== undefined ? ` opacity="${el.opacity}"` : "";
    const hasBorder = el.strokeWidth && el.strokeWidth > 0 && el.strokeColor;
    const radius = el.cornerRadius ?? 0;
    const hasRadius = radius > 0;
    const radiusAttr = hasRadius ? ` rx="${f(radius)}" ry="${f(radius)}"` : "";
    const hasShadow = el.shadowColor !== undefined;

    if (el.flipX || el.flipY) {
      const cx = el.x + el.width / 2 + ox;
      const cy = el.y + el.height / 2 + oy;
      const sx = el.flipX ? -1 : 1;
      const sy = el.flipY ? -1 : 1;
      const rotationDegrees = (el.rotation ?? 0) * (180 / Math.PI);
      const transform = `translate(${f(cx)}, ${f(cy)}) rotate(${f(rotationDegrees)}) scale(${sx}, ${sy}) translate(${f(-cx)}, ${f(-cy)})`;

      let content = "";
      const clipId = `clip-${crypto.randomUUID()}`;
      const filterId = hasShadow ? `filter-${crypto.randomUUID()}` : "";

      if (hasShadow) {
        const shadowBlur = el.shadowBlur ?? 10;
        const shadowOffsetX = el.shadowOffsetX ?? 5;
        const shadowOffsetY = el.shadowOffsetY ?? 5;
        content += `<defs><filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${f(shadowOffsetX)}" dy="${f(shadowOffsetY)}" stdDeviation="${f(shadowBlur)}" flood-color="${escAttr(el.shadowColor!)}" /></filter></defs>`;
      }

      if (hasRadius) {
        content += `<defs><clipPath id="${clipId}"><rect x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" rx="${f(radius)}" ry="${f(radius)}" /></clipPath></defs>`;
      }

      const clipAttr = hasRadius ? ` clip-path="url(#${clipId})"` : "";
      const filterAttr = hasShadow ? ` filter="url(#${filterId})"` : "";
      content += `<image x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" href="${el.src}"${clipAttr}${filterAttr} />`;

      if (hasBorder) {
        content += `<rect x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" fill="none" stroke="${escAttr(el.strokeColor!)}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${radiusAttr} />`;
      }

      return (
        `<g transform="${transform}"${opacityAttr}>` +
        content +
        `</g>`
      );
    } else {
      let content = "";
      const clipId = `clip-${crypto.randomUUID()}`;
      const filterId = hasShadow ? `filter-${crypto.randomUUID()}` : "";

      if (hasShadow) {
        const shadowBlur = el.shadowBlur ?? 10;
        const shadowOffsetX = el.shadowOffsetX ?? 5;
        const shadowOffsetY = el.shadowOffsetY ?? 5;
        content += `<defs><filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${f(shadowOffsetX)}" dy="${f(shadowOffsetY)}" stdDeviation="${f(shadowBlur)}" flood-color="${escAttr(el.shadowColor!)}" /></filter></defs>`;
      }

      if (hasRadius) {
        content += `<defs><clipPath id="${clipId}"><rect x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" rx="${f(radius)}" ry="${f(radius)}" /></clipPath></defs>`;
      }

      const clipAttr = hasRadius ? ` clip-path="url(#${clipId})"` : "";
      const filterAttr = hasShadow ? ` filter="url(#${filterId})"` : "";
      content += `<image x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" href="${el.src}"${rot}${opacityAttr}${clipAttr}${filterAttr} />`;

      if (hasBorder) {
        content += `<rect x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" fill="none" stroke="${escAttr(el.strokeColor!)}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${rot}${radiusAttr} />`;
      }

      return content;
    }
  }

  return "";
}

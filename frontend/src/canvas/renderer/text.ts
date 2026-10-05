import type { Bounds } from "@/types/geometry";
import type { TextElement } from "@/types/canvas";

export function buildTextFont(element: TextElement): string {
  const style = element.fontStyle || "normal";
  const weight = element.fontWeight || "normal";
  const size = element.fontSize || 20;
  const family = element.fontFamily || "Arial, sans-serif";
  return `${style} ${weight} ${size}px ${family}`;
}

export function getTextLines(text: string): string[] {
  return text.split("\n");
}

export function getTextMetrics(context: CanvasRenderingContext2D, element: TextElement) {
  context.save();
  context.font = buildTextFont(element);
  
  const lines = getTextLines(element.text);
  let maxWidth = 0;
  
  for (const line of lines) {
    const width = context.measureText(line).width;
    if (width > maxWidth) {
      maxWidth = width;
    }
  }
  
  context.restore();
  
  return { width: maxWidth, lines };
}

export function drawTextElement(context: CanvasRenderingContext2D, text: TextElement) {
  context.save();
  
  const { width, lines } = getTextMetrics(context, text);
  
  if (text.rotation) {
    // Preserve exact original rotation anchor logic
    const cx = text.x;
    const cy = text.y - text.fontSize / 2;
    context.translate(cx, cy);
    context.rotate(text.rotation);
    context.translate(-cx, -cy);
  }

  context.fillStyle = text.strokeColor;
  context.font = buildTextFont(text);
  context.textBaseline = "alphabetic";
  
  const align = text.textAlign || "left";
  context.textAlign = align;
  
  let drawX = text.x;
  if (align === "center") {
    drawX = text.x + width / 2;
  } else if (align === "right") {
    drawX = text.x + width;
  }
  
  const lh = text.lineHeight || 1.2;
  const lineSpacing = text.fontSize * lh;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const currentY = text.y + i * lineSpacing;
    context.fillText(line, drawX, currentY);
    
    if (text.textDecoration === "underline") {
      const lineWidth = context.measureText(line).width;
      let lineLeft = text.x;
      if (align === "center") {
        lineLeft = text.x + width / 2 - lineWidth / 2;
      } else if (align === "right") {
        lineLeft = text.x + width - lineWidth;
      }
      
      const underlineY = currentY + text.fontSize * 0.15;
      context.beginPath();
      context.moveTo(lineLeft, underlineY);
      context.lineTo(lineLeft + lineWidth, underlineY);
      context.lineWidth = Math.max(1, text.fontSize * 0.05);
      context.strokeStyle = text.strokeColor;
      context.stroke();
    }
  }

  context.restore();
}

export function getTextBounds(context: CanvasRenderingContext2D, element: TextElement): Bounds {
  const { width, lines } = getTextMetrics(context, element);
  const lh = element.lineHeight || 1.2;
  const totalHeight = Math.max(0, (lines.length - 1)) * element.fontSize * lh + element.fontSize;
  
  return {
    left: element.x,
    top: element.y - element.fontSize,
    right: element.x + width,
    bottom: element.y - element.fontSize + totalHeight,
  };
}

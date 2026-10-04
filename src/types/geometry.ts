export type Point = {
  x: number;
  y: number;
};

export type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type Viewport = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type AlignmentGuide =
  | {
      type: "vertical";
      position: number;
      start: number;
      end: number;
    }
  | {
      type: "horizontal";
      position: number;
      start: number;
      end: number;
    };

export type ResizeHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "rotate";

export type CropHandle = "crop-top-left" | "crop-top-right" | "crop-bottom-left" | "crop-bottom-right";

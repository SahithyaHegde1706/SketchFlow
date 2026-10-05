import type { WhiteboardElement } from "@/types/canvas";
import { ImageActions } from "@/components/board/properties/image/ImageActions";
import { ImageStyleControls } from "@/components/board/properties/image/ImageStyleControls";
import { ImageTransformControls } from "@/components/board/properties/image/ImageTransformControls";

type ImageSectionProps = {
  isSingleImage: boolean;
  imageElement: (WhiteboardElement & { type: "image" }) | null;
  hasImages: boolean;
  imageOpacity: number | "mixed" | undefined;
  imageCornerRadius: number | "mixed" | undefined;
  localOpacity: number | null;
  localCornerRadius: number | null;
  setLocalOpacity: (val: number | null) => void;
  setLocalCornerRadius: (val: number | null) => void;
  isLocked: boolean;
  onUpdateProperties: (updates: Partial<WhiteboardElement>, commitHistory?: boolean) => void;
  onStartCrop?: () => void;
};

export function ImageSection({
  isSingleImage,
  imageElement,
  hasImages,
  imageOpacity,
  imageCornerRadius,
  localOpacity,
  localCornerRadius,
  setLocalOpacity,
  setLocalCornerRadius,
  isLocked,
  onUpdateProperties,
  onStartCrop,
}: ImageSectionProps) {
  return (
    hasImages && (
      <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Image</h3>
        <ImageStyleControls
          imageOpacity={imageOpacity}
          imageCornerRadius={imageCornerRadius}
          localOpacity={localOpacity}
          localCornerRadius={localCornerRadius}
          setLocalOpacity={setLocalOpacity}
          setLocalCornerRadius={setLocalCornerRadius}
          isLocked={isLocked}
          onUpdateProperties={onUpdateProperties}
        />
        {isSingleImage && imageElement && (
          <>
            <ImageTransformControls
              imageElement={imageElement}
              isLocked={isLocked}
              onUpdateProperties={onUpdateProperties}
            />
            <ImageActions
              imageElement={imageElement}
              isLocked={isLocked}
              onUpdateProperties={onUpdateProperties}
              onStartCrop={onStartCrop}
            />
          </>
        )}
      </div>
    )
  );
}

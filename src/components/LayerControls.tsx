import type { LayerAvailability } from "@/editor/layering";
import type { LayerOperation } from "@/editor/layering";

type LayerControlsProps = LayerAvailability & {
  onLayerOperation: (operation: LayerOperation) => void;
};

const controls = [
  { operation: "bring-forward", label: "Bring Forward", icon: "↑" },
  { operation: "send-backward", label: "Send Backward", icon: "↓" },
  { operation: "bring-to-front", label: "Bring to Front", icon: "⇈" },
  { operation: "send-to-back", label: "Send to Back", icon: "⇊" },
] as const;

export function LayerControls({
  canBringForward,
  canSendBackward,
  canBringToFront,
  canSendToBack,
  onLayerOperation,
}: LayerControlsProps) {
  const availability = {
    "bring-forward": canBringForward,
    "send-backward": canSendBackward,
    "bring-to-front": canBringToFront,
    "send-to-back": canSendToBack,
  } as const;

  return (
    <div aria-label="Layer order" className="flex items-center gap-1">
      {controls.map(control => (
        <button
          key={control.operation}
          type="button"
          aria-label={control.label}
          title={control.label}
          disabled={!availability[control.operation]}
          onClick={() => onLayerOperation(control.operation)}
          className="inline-flex size-9 items-center justify-center rounded-lg text-base text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
        >
          <span aria-hidden="true">{control.icon}</span>
        </button>
      ))}
    </div>
  );
}
import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { getToolForShortcut, hasShortcutModifier, isTextEditingTarget } from "@/editor/shortcuts";
import type { LayerOperation } from "@/editor/layering";
import type { Tool } from "@/types/canvas";

type CanvasKeyboardActions = {
  finishKeyboardMovement: () => void;
  moveSelectedByKeyboard: (deltaX: number, deltaY: number) => boolean;
  cancelInteraction: () => void;
  handleCopy: () => void;
  handleDuplicate: () => void;
  handlePaste: () => void;
  handleRedo: () => void;
  handleUndo: () => void;
  handleLayerOperation: (operation: LayerOperation) => void;
  notifyClipboardChange: () => void;
  onToolSelect: (tool: Tool) => void;
  handleGroup: () => void;
  handleUngroup: () => void;
  deleteSelection: () => void;
  handleLock: () => void;
  handleUnlock: () => void;
};

type UseCanvasKeyboardOptions = {
  actions: CanvasKeyboardActions;
  isTextEditorActive: () => boolean;
  cancelText: () => void;
  commitText: () => void;
  hasActiveInteraction: () => boolean;
  clearSelection: () => void;
};

export function useCanvasKeyboard({
  actions,
  isTextEditorActive,
  cancelText,
  commitText,
  hasActiveInteraction,
  clearSelection,
}: UseCanvasKeyboardOptions) {
  const actionsRef = useRef(actions);

  useEffect(() => {
    actionsRef.current = actions;
  });

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const currentActions = actionsRef.current;
      if (isTextEditingTarget(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        currentActions.finishKeyboardMovement();
        event.preventDefault();
        if (isTextEditorActive()) {
          cancelText();
        } else if (hasActiveInteraction()) {
          currentActions.cancelInteraction();
        } else {
          clearSelection();
          currentActions.notifyClipboardChange();
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        currentActions.finishKeyboardMovement();
        currentActions.deleteSelection();
        return;
      }

      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;
      const layerModifierKey = event.ctrlKey || event.metaKey;
      const layerShortcut = layerModifierKey && (
        event.code === "BracketRight" || event.code === "BracketLeft"
      );
      if (layerShortcut) {
        event.preventDefault();
        currentActions.finishKeyboardMovement();
        const operation: LayerOperation = event.code === "BracketRight"
          ? event.shiftKey ? "bring-to-front" : "bring-forward"
          : event.shiftKey ? "send-to-back" : "send-backward";
        currentActions.handleLayerOperation(operation);
        return;
      }
      if (modifierKey && event.key.toLowerCase() === "z") {
        currentActions.finishKeyboardMovement();
        event.preventDefault();
        if (event.shiftKey) currentActions.handleRedo();
        else currentActions.handleUndo();
        return;
      }
      if (modifierKey && event.key.toLowerCase() === "c") {
        currentActions.finishKeyboardMovement();
        event.preventDefault();
        currentActions.handleCopy();
        return;
      }
      if (modifierKey && event.key.toLowerCase() === "v") {
        currentActions.finishKeyboardMovement();
        event.preventDefault();
        currentActions.handlePaste();
        return;
      }
      if (modifierKey && event.key.toLowerCase() === "d") {
        currentActions.finishKeyboardMovement();
        event.preventDefault();
        currentActions.handleDuplicate();
        return;
      }
      if (modifierKey && event.key.toLowerCase() === "g") {
        currentActions.finishKeyboardMovement();
        event.preventDefault();
        if (event.shiftKey) currentActions.handleUngroup();
        else currentActions.handleGroup();
        return;
      }
      if (modifierKey && event.shiftKey && event.key.toLowerCase() === "l") {
        currentActions.finishKeyboardMovement();
        event.preventDefault();
        currentActions.handleLock();
        return;
      }
      if (modifierKey && event.shiftKey && event.key.toLowerCase() === "u") {
        currentActions.finishKeyboardMovement();
        event.preventDefault();
        currentActions.handleUnlock();
        return;
      }
      if (hasShortcutModifier(event)) {
        return;
      }

      const movement = {
        ArrowUp: { deltaX: 0, deltaY: event.shiftKey ? -10 : -1 },
        ArrowDown: { deltaX: 0, deltaY: event.shiftKey ? 10 : 1 },
        ArrowLeft: { deltaX: event.shiftKey ? -10 : -1, deltaY: 0 },
        ArrowRight: { deltaX: event.shiftKey ? 10 : 1, deltaY: 0 },
      }[event.key];
      if (movement) {
        if (currentActions.moveSelectedByKeyboard(movement.deltaX, movement.deltaY)) {
          event.preventDefault();
        }
        return;
      }

      const tool = getToolForShortcut(event.key);
      if (!tool) return;
      event.preventDefault();
      currentActions.finishKeyboardMovement();
      if (hasActiveInteraction()) {
        currentActions.cancelInteraction();
      }
      currentActions.onToolSelect(tool);
    };

    const handleKeyUp = (event: globalThis.KeyboardEvent) => {
      if (event.key.startsWith("Arrow")) {
        actionsRef.current.finishKeyboardMovement();
      }
    };

    const handleWindowBlur = () => {
      actionsRef.current.finishKeyboardMovement();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitText();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelText();
    }
  };
}

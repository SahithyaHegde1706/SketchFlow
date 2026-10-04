import { useEffect, useRef, type KeyboardEvent } from "react";
import {
  handleCanvasKeyDown,
  handleCanvasKeyUp,
  handleCanvasWindowBlur,
  handleTextInputKeyDown,
  type KeyboardActions,
  type KeyboardHandlerOptions,
} from "@/hooks/keyboardHandlers";

type UseCanvasKeyboardOptions = Omit<KeyboardHandlerOptions, "actions"> & {
  actions: KeyboardActions;
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
      handleCanvasKeyDown(event, {
        actions: actionsRef.current,
        isTextEditorActive,
        cancelText,
        commitText,
        hasActiveInteraction,
        clearSelection,
      });
    };

    const handleKeyUp = (event: globalThis.KeyboardEvent) => {
      handleCanvasKeyUp(event, actionsRef.current);
    };

    const handleWindowBlur = () => {
      handleCanvasWindowBlur(actionsRef.current);
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
    handleTextInputKeyDown(event, { commitText, cancelText });
  };
}

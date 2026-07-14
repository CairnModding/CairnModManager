import { useToastStore } from "../../state/toastStore";
import { ToastStack } from "../primitives/ToastStack";

/** Wires the generic `ToastStack` to app state: the toast queue, and "View log" jumping to the
 * Manager Log tab (navigation is the app's, not the primitive's, concern). */
export function ErrorToastHost({ onViewLog }: { onViewLog: () => void }) {
  const { toasts, dismiss } = useToastStore();

  return (
    <ToastStack
      toasts={toasts}
      actionLabel="View log"
      onAction={(id) => {
        onViewLog();
        dismiss(id);
      }}
      onDismiss={dismiss}
    />
  );
}

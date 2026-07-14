import "./primitives.css";

export interface ToastItem {
  readonly id: string;
  readonly message: string;
  readonly variant: "error" | "info";
}

/** Generic stacked toast surface — no app knowledge. Each toast previews `message` (truncated by
 * CSS, not JS, so it stays a plain string) with an optional action button and a dismiss button. */
export function ToastStack({
  toasts,
  actionLabel,
  onAction,
  onDismiss,
}: {
  toasts: readonly ToastItem[];
  actionLabel?: string;
  onAction: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="cm-toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`cm-toast cm-toast--${toast.variant}`}>
          <span className="cm-toast__message">{toast.message}</span>
          <div className="cm-toast__actions">
            {actionLabel && (
              <button className="cm-toast__action" onClick={() => onAction(toast.id)}>
                {actionLabel}
              </button>
            )}
            <button className="cm-toast__dismiss" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

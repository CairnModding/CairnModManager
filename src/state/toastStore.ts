import { create } from "zustand";

export type ToastVariant = "error" | "info";

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly variant: ToastVariant;
}

const AUTO_DISMISS_MS = 8000;

interface ToastState {
  readonly toasts: readonly Toast[];
  push(message: string, variant: ToastVariant): void;
  dismiss(id: string): void;
}

/** Transient toast queue — the surfacing layer for anything logged to `appLogStore`. Toasts
 * preview the message and auto-dismiss; the durable record lives in the Manager Log, which a
 * toast's "View log" button jumps to. */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push(message, variant) {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },
  dismiss(id) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export function pushToast(message: string, variant: ToastVariant = "error"): void {
  useToastStore.getState().push(message, variant);
}

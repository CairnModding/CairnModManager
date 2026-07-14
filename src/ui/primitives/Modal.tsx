import type { ReactNode } from "react";
import { useEffect } from "react";
import "./primitives.css";

/** Generic overlay dialog — no app knowledge. Closes on Escape or backdrop click; content clicks
 * are stopped from bubbling to the backdrop. */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cm-modal-backdrop" onClick={onClose}>
      <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-modal__header">
          {title && <h2 className="cm-modal__title">{title}</h2>}
          <button className="cm-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="cm-modal__body">{children}</div>
        {footer && <div className="cm-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

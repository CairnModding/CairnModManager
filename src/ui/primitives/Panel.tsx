import type { ReactNode } from "react";
import "./primitives.css";

/** `fill` stretches the panel (and its body) to the height of its flex container instead of
 * shrink-wrapping content — use for panels whose content should own its own scroll region, like
 * the log viewer, rather than pushing the whole page taller. */
export function Panel({
  title,
  fill,
  children,
}: {
  title?: string;
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`cm-panel ${fill ? "cm-panel--fill" : ""}`}>
      {title && <h2 className="cm-panel__title">{title}</h2>}
      <div className={`cm-panel__body ${fill ? "cm-panel__body--fill" : ""}`}>{children}</div>
    </section>
  );
}

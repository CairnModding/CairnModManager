import "./primitives.css";

export function StatusDot({ on, title }: { on: boolean; title?: string }) {
  return <span className={`cm-status-dot ${on ? "cm-status-dot--on" : "cm-status-dot--off"}`} title={title} />;
}

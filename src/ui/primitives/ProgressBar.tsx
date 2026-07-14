import "./primitives.css";

export function ProgressBar({ fraction, label }: { fraction?: number; label?: string }) {
  const indeterminate = fraction === undefined;
  return (
    <div className="cm-progress" aria-label={label}>
      <div
        className={`cm-progress__fill ${indeterminate ? "cm-progress__fill--indeterminate" : ""}`}
        style={indeterminate ? undefined : { width: `${Math.round(fraction * 100)}%` }}
      />
    </div>
  );
}

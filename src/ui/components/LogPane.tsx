import { useEffect, useRef } from "react";
import "./components.css";

export function LogPane({
  lines,
  className,
}: {
  lines: readonly string[];
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  return (
    <div className={`cm-log-pane ${className ?? ""}`}>
      {lines.length === 0 && <div className="cm-log-pane__empty">Nothing logged yet.</div>}
      {lines.map((line, i) => (
        <div
          className={`cm-log-pane__line ${/^\[.*ERROR/.test(line) ? "cm-log-pane__line--error" : ""}`}
          key={i}
        >
          {line}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

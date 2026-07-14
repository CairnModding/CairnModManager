import type { ReactNode } from "react";
import "./primitives.css";

export type BadgeVariant = "neutral" | "info" | "success" | "error" | "warning";

export function Badge({ variant = "neutral", children }: { variant?: BadgeVariant; children: ReactNode }) {
  return <span className={`cm-badge cm-badge--${variant}`}>{children}</span>;
}

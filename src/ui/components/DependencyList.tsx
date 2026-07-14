import type { SourceId } from "../../domain/modRef";
import { useModDependencies } from "../../state/useModDependencies";
import "./components.css";

/** "Requires: X, Y" — inline, meant to sit alongside download/endorsement stats on the same
 * line (see `ModCard`/`ModDetailModal`), not as its own standalone block. */
export function DependencyList({ sourceId, modId }: { sourceId: SourceId; modId: string }) {
  const { data, isLoading } = useModDependencies(sourceId, modId);

  if (isLoading) return <span className="cm-dependency-list--loading">Checking dependencies…</span>;
  if (!data || data.length === 0) return null;

  return <span>Requires: {data.map((mod) => mod.name).join(", ")}</span>;
}

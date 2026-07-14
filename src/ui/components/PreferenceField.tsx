import { useState } from "react";
import { Button } from "../primitives/Button";
import "./components.css";

export function PreferenceField({
  entryKey,
  value,
  onCommit,
}: {
  entryKey: string;
  value: string;
  onCommit: (newValue: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const dirty = draft !== value;

  return (
    <div className="cm-preference-field">
      <span className="cm-preference-field__key">{entryKey}</span>
      <input
        className="cm-preference-field__input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <Button variant="primary" disabled={!dirty} onClick={() => onCommit(draft)}>
        Save
      </Button>
    </div>
  );
}

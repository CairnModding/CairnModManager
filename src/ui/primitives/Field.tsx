import type { InputHTMLAttributes } from "react";
import "./primitives.css";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, id, ...rest }: FieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="cm-field">
      <label className="cm-field__label" htmlFor={fieldId}>
        {label}
      </label>
      <input className="cm-field__input" id={fieldId} {...rest} />
    </div>
  );
}

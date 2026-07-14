import type { SelectHTMLAttributes } from "react";
import "./primitives.css";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function Select({ label, id, children, ...rest }: SelectProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="cm-field">
      <label className="cm-field__label" htmlFor={fieldId}>
        {label}
      </label>
      <select className="cm-field__input" id={fieldId} {...rest}>
        {children}
      </select>
    </div>
  );
}

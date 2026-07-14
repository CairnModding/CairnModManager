import type { ButtonHTMLAttributes } from "react";
import "./primitives.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export function Button({ variant = "secondary", className, ...rest }: ButtonProps) {
  return <button className={`cm-button cm-button--${variant} ${className ?? ""}`} {...rest} />;
}

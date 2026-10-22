import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";

// One button style for the whole app (UIUX_AUDIT.md section 4.2)
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm" | "lg";

function classes(variant: ButtonVariant, size: ButtonSize, block: boolean, extra?: string) {
  return ["btn", `btn-${variant}`, size !== "md" && `btn-${size}`, block && "btn-block", extra]
    .filter(Boolean)
    .join(" ");
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className,
  type = "button",
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classes(variant, size, block, className)} {...rest}>
      {children}
    </button>
  );
}

// A link that looks like a button (navigation, not an action)
export function ButtonLink({
  variant = "primary",
  size = "md",
  block = false,
  className,
  children,
  ...rest
}: CommonProps & LinkProps) {
  return (
    <Link className={classes(variant, size, block, className)} {...rest}>
      {children}
    </Link>
  );
}

// External link styled as a button (opens in a new tab)
export function ButtonAnchor({
  variant = "secondary",
  size = "md",
  block = false,
  className,
  children,
  href,
}: CommonProps & { href: string; className?: string }) {
  return (
    <a className={classes(variant, size, block, className)} href={href} target="_blank" rel="noreferrer">
      {children}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

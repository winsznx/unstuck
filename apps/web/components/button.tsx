import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type Variant = "primary" | "secondary" | "quiet" | "inverse";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-colors duration-(--duration-fast) ease-(--ease-standard) disabled:cursor-not-allowed disabled:opacity-50";
const sizes: Record<Size, string> = {
  md: "min-h-11 text-body",
  lg: "min-h-13 text-input",
};
const variants: Record<Variant, string> = {
  primary: "bg-action px-5 text-on-action hover:bg-action-strong",
  secondary: "border border-border-strong bg-surface px-5 text-ink hover:border-ink-muted hover:bg-surface-muted",
  quiet: "px-1 text-ink-secondary underline-offset-4 hover:text-ink hover:underline",
  inverse: "bg-log-strong px-5 text-on-open hover:bg-log-ink",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

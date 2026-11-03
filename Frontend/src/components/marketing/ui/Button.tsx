import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "light" | "secondary" | "outline" | "outlineLight";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-[15px] font-medium leading-none whitespace-nowrap transition-base select-none";

const variants: Record<Variant, string> = {
  /* Primary: Royal bg, Ice text (12.1:1) */
  primary:
    "bg-royal text-ice hover:bg-blue-700 active:translate-y-px disabled:bg-line disabled:text-muted",
  /* Primary on dark surfaces: Ice bg, Royal text */
  light: "bg-ice text-royal hover:bg-blue-100 active:translate-y-px",
  /* Secondary: Powder bg, Royal text (6.7:1) */
  secondary: "bg-powder text-royal hover:bg-blue-200 active:translate-y-px",
  /* Outline: 1px currentColor border */
  outline:
    "border border-current bg-transparent text-royal hover:bg-blue-100 active:translate-y-px",
  /* Outline on dark surfaces: Ice text, Royal is the dark surface */
  outlineLight:
    "border border-ice/70 bg-transparent text-ice hover:bg-blue-900 hover:border-blue-900 active:translate-y-px",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-6",
  sm: "h-9 px-4 text-sm",
};

type ButtonOwnProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonOwnProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & {
    href: string;
  };

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonAsButton | ButtonAsLink) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if ("href" in props && props.href !== undefined) {
    const { href, ...rest } = props;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...(props as ButtonAsButton)}>
      {children}
    </button>
  );
}

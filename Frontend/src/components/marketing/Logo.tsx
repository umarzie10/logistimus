import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoVariant = "on-light" | "on-dark";

/**
 * Logistimus mark — Uses the official user-provided Logistimus brand mark
 * (/public/logo-transparent.png), showing the stylized "L" highway winding forward.
 */
export function LogoMark({
  className,
  variant = "on-light",
}: {
  className?: string;
  variant?: LogoVariant;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        variant === "on-dark" && "",
        className ?? "h-8 w-8",
      )}
    >
      <Image
        src="/logo-transparent.png"
        alt="Logistimus Logo"
        width={64}
        height={74}
        unoptimized
        priority
        className="h-full w-auto object-contain"
      />
    </span>
  );
}

/**
 * Full lockup: mark + wordmark.
 */
export function Logo({
  className,
  variant = "on-light",
}: {
  className?: string;
  variant?: LogoVariant;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5",
        variant === "on-dark" ? "text-ice" : "text-royal",
        className,
      )}
    >
      <LogoMark variant={variant} className="h-8 w-8" />
      <span className="text-[20px] font-semibold leading-none tracking-[-0.015em]">
        Logistimus
      </span>
    </span>
  );
}

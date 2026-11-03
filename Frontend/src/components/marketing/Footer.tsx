import type { SVGProps } from "react";
import Link from "next/link";
import { Logo } from "@/components/marketing/Logo";
import { LanguageSelector } from "@/components/marketing/LanguageSelector";

const QUICK_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Orders", href: "/orders" },
  { label: "Fleet", href: "/fleet" },
  { label: "Warehouse", href: "/warehouse" },
  { label: "Pricing", href: "/pricing" },
  { label: "Client Portal", href: "/portal" },
  { label: "Sign In", href: "/sign-in" },
];

function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2.5 9.5h5v12h-5v-12Zm7 0h4.78v1.64h.07c.67-1.2 2.3-2.47 4.73-2.47 5.06 0 6 3.2 6 7.36v6.47h-5v-5.74c0-1.37-.03-3.13-1.95-3.13-1.95 0-2.25 1.49-2.25 3.03v5.84h-5v-12Z" />
    </svg>
  );
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M17.53 3h3.2l-6.99 7.99L22 21h-6.43l-5.03-6.58L4.8 21H1.6l7.48-8.55L2 3h6.6l4.55 6.02L17.53 3Zm-1.12 16.1h1.77L7.7 4.81H5.8l10.61 14.29Z" />
    </svg>
  );
}

function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M23 12s0-3.4-.43-5.03a2.6 2.6 0 0 0-1.83-1.85C19.1 4.7 12 4.7 12 4.7s-7.1 0-8.74.42a2.6 2.6 0 0 0-1.83 1.85C1 8.6 1 12 1 12s0 3.4.43 5.03c.24.9.94 1.6 1.83 1.85 1.64.42 8.74.42 8.74.42s7.1 0 8.74-.42a2.6 2.6 0 0 0 1.83-1.85C23 15.4 23 12 23 12Zm-13.4 3.27V8.73L15.2 12l-5.6 3.27Z" />
    </svg>
  );
}

const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/logistimus", Icon: LinkedinIcon },
  { label: "X", href: "https://x.com/logistimus", Icon: XIcon },
  { label: "YouTube", href: "https://www.youtube.com/@logistimus", Icon: YoutubeIcon },
];

export function Footer() {
  return (
    <footer id="footer" className="border-t border-blue-900/40 bg-midnight text-ice py-8">
      <div className="container-page">
        {/* Top: Logo + Essential Nav Links + Socials */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-blue-900/40">
          <Link href="#top" aria-label="Logistimus home">
            <Logo variant="on-dark" />
          </Link>

          <nav aria-label="Quick links" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-blue-200/80">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-ice"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <ul className="flex items-center gap-2">
            {SOCIALS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-800 text-powder transition-all hover:border-powder hover:text-ice hover:bg-blue-900/50"
                >
                  <Icon aria-hidden="true" className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: Minimal Copyright & Legal */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-blue-200/60 font-mono">
          <p>© 2026 Logistimus Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ice transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-ice transition-colors">Terms</Link>
            <LanguageSelector />
          </div>
        </div>
      </div>
    </footer>
  );
}

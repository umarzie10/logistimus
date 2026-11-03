import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/marketing/Logo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of the Logistimus platform.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ice">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" aria-label="Logistimus home">
            <Logo />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-royal transition-colors duration-150 hover:text-blue-700"
          >
            ← Back to site
          </Link>
        </div>
      </header>

      <main id="main" className="container-page flex-1 py-16 lg:py-24">
        <p className="type-label text-muted">Legal</p>
        <h1 className="type-display mt-5 max-w-[720px]">Terms of Service</h1>
        <p className="type-body mt-6 text-muted">
          Last updated: January 2026. These terms govern access to and use of the Logistimus
          platform.
        </p>

        <div className="mt-12 max-w-[720px] space-y-10">
          {[
            {
              h: "Using the platform",
              p: "Logistimus provides order, fleet, dispatch, warehouse, finance and analytics software for logistics businesses. You are responsible for the accuracy of the data your organisation enters into the platform and for keeping user credentials secure.",
            },
            {
              h: "Accounts and access",
              p: "Access is granted per organisation and governed by role-based permissions. You are responsible for activity that occurs under your accounts and for promptly revoking access for users who leave your team.",
            },
            {
              h: "Availability",
              p: "We work to keep the platform reliable and will communicate planned maintenance in advance. Scheduled maintenance and circumstances outside reasonable control may affect availability.",
            },
            {
              h: "Acceptable use",
              p: "You may not reverse engineer the platform, attempt to bypass security controls, upload unlawful content, or use the service to interfere with other customers' data.",
            },
            {
              h: "Contact",
              p: "Questions about these terms can be sent to legal@logistimus.com.",
            },
          ].map((s) => (
            <section key={s.h}>
              <h2 className="text-2xl font-light tracking-[-0.01em] text-royal">{s.h}</h2>
              <p className="mt-3 text-base leading-relaxed text-muted">{s.p}</p>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="container-page py-8">
          <p className="text-sm text-muted">© 2026 Logistimus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/marketing/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Logistimus collects, uses and protects your information.",
};

export default function PrivacyPage() {
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
        <h1 className="type-display mt-5 max-w-[720px]">Privacy Policy</h1>
        <p className="type-body mt-6 text-muted">
          Last updated: January 2026. This page explains what information Logistimus collects
          and how it is used.
        </p>

        <div className="mt-12 max-w-[720px] space-y-10">
          {[
            {
              h: "Information we collect",
              p: "We collect account details you provide when creating an organisation (such as name, work email and company information), operational data you enter into the platform (orders, vehicles, drivers, customers and documents), and technical data such as browser type, IP address and usage events.",
            },
            {
              h: "How we use information",
              p: "Information is used to operate the platform, process your logistics data as instructed, provide support, maintain security, and improve product functionality. We do not sell your data.",
            },
            {
              h: "Data isolation",
              p: "Logistimus is a multi-tenant platform. Each organisation's data is isolated through row-level security policies so that one customer's data is never visible to another.",
            },
            {
              h: "Retention and deletion",
              p: "Operational data is retained while your account is active. When you close an account, customer data is deleted within a reasonable period, except where retention is required by law.",
            },
            {
              h: "Contact",
              p: "Questions about this policy can be sent to privacy@logistimus.com.",
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

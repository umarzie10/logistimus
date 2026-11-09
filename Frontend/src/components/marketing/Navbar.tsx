"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/marketing/Logo";
import { Button } from "@/components/marketing/ui/Button";
import { cn } from "@/lib/utils";

type NavItem = { label: string; desc: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { label: "Order Management", desc: "Create, track and manage every order", href: "/orders" },
      { label: "Fleet Management", desc: "Vehicles, maintenance and fuel", href: "/fleet" },
      { label: "Dispatch & Routing", desc: "Plan routes and assign drivers", href: "/dispatch" },
      { label: "Warehouse Management", desc: "Inventory, receiving and shipping", href: "/warehouse" },
      { label: "GPS Tracking", desc: "Live vehicle and shipment positions", href: "/dispatch" },
      { label: "CRM & Customers", desc: "Customers, leads and contracts", href: "/crm" },
      { label: "Finance & Billing", desc: "Invoices, expenses and profit", href: "/finance" },
      { label: "Analytics & Intelligence", desc: "Operational insight and reporting", href: "/analytics" },
    ],
  },
  {
    label: "Solutions",
    items: [
      { label: "Logistics Companies", desc: "End-to-end operations management", href: "/portal" },
      { label: "Freight Forwarders", desc: "Shipments across carriers and borders", href: "/orders" },
      { label: "Transportation Businesses", desc: "Fleet, drivers and dispatch in one place", href: "/fleet" },
      { label: "Warehouse Operators", desc: "Stock, receiving and fulfilment", href: "/warehouse" },
      { label: "Distributors", desc: "Orders, routes and customer delivery", href: "/dashboard" },
    ],
  },
  {
    label: "Industries",
    items: [
      { label: "Retail & Distribution", desc: "Multi-node delivery networks", href: "/orders" },
      { label: "Manufacturing", desc: "Inbound and outbound flow control", href: "/warehouse" },
      { label: "Food & Beverage", desc: "Time-critical scheduled deliveries", href: "/fleet" },
      { label: "E-commerce", desc: "High-volume last-mile operations", href: "/orders" },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Documentation", desc: "Guides for every module", href: "/settings" },
      { label: "Help Center", desc: "Client support & tracking portal", href: "/portal" },
      { label: "API Reference", desc: "Integrate Logistimus with your systems", href: "/settings" },
      { label: "Pricing & Plans", desc: "Predictable tiers for every fleet", href: "/pricing" },
    ],
  },
];

export function Navbar() {
  const [open, setOpen] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobileOpen(false);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav
        ref={navRef}
        aria-label="Main"
        className="container-page relative z-50 flex h-14 items-center justify-between gap-4 rounded-full border border-line bg-ice py-1.5 pl-5 pr-1.5"
      >
        <Link href="#top" aria-label="Logistimus home" className="shrink-0">
          <Logo />
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_GROUPS.map((group, i) => (
            <li key={group.label} className="nav-dd group relative">
              <button
                type="button"
                aria-expanded={open === i}
                aria-haspopup="menu"
                onClick={() => setOpen(open === i ? null : i)}
                onMouseEnter={() => setOpen(i)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3.5 py-2 text-sm transition-colors duration-150",
                  open === i ? "bg-powder text-royal" : "text-royal hover:bg-blue-100",
                )}
              >
                {group.label}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-150",
                    open === i && "rotate-180",
                  )}
                />
              </button>

              <div
                role="menu"
                className={cn(
                  "invisible absolute left-1/2 top-full z-10 mt-3 w-[520px] -translate-x-1/2 rounded-card border border-line bg-ice p-3 opacity-0 transition-[opacity,visibility] duration-150",
                  "group-focus-within:visible group-focus-within:opacity-100",
                  open === i && "visible opacity-100",
                )}
              >
                <ul className="grid grid-cols-2 gap-1">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        role="menuitem"
                        onClick={() => setOpen(null)}
                        className="block rounded-full px-3.5 py-2.5 transition-colors duration-150 hover:bg-blue-100"
                      >
                        <span className="block text-sm font-medium leading-tight text-royal">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                          {item.desc}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
          <li>
            <Link
              href="/pricing"
              className="rounded-full px-3.5 py-2 text-sm text-royal transition-colors duration-150 hover:bg-blue-100"
            >
              Pricing
            </Link>
          </li>
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="outline" size="sm" href="/sign-in">
            Sign In
          </Button>
          <Button variant="primary" size="sm" href="/sign-up">
            Get Started
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line text-royal transition-colors duration-150 hover:bg-blue-100 lg:hidden"
        >
          <Menu
            aria-hidden="true"
            className={cn(
              "absolute h-5 w-5 transition-all duration-200",
              mobileOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100",
            )}
          />
          <X
            aria-hidden="true"
            className={cn(
              "absolute h-5 w-5 transition-all duration-200",
              mobileOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0",
            )}
          />
        </button>
      </nav>

      {/* Mobile drawer — Compact, clean mobile menu */}
      <div
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-0 top-0 z-40 bg-ice/95 backdrop-blur-md transition-[opacity,visibility] duration-200 lg:hidden",
          mobileOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <nav aria-label="Mobile" className="h-full overflow-y-auto px-5 pb-8 pt-20 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-2 font-semibold">
              Platform Modules
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Orders", href: "/orders" },
                { label: "Fleet", href: "/fleet" },
                { label: "Dispatch", href: "/dispatch" },
                { label: "Warehouse", href: "/warehouse" },
                { label: "CRM", href: "/crm" },
                { label: "Finance", href: "/finance" },
                { label: "Analytics", href: "/analytics" },
                { label: "AI Assistant", href: "/ai" },
                { label: "Pricing", href: "/pricing" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="p-2.5 rounded-full border border-line bg-white text-xs font-medium text-royal hover:bg-blue-100 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-line/60">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-2 font-semibold">
                Portals & Links
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/portal"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-1.5 rounded-full border border-line bg-white text-xs text-royal font-medium"
                >
                  Customer Portal
                </Link>
                <Link
                  href="/driver"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-1.5 rounded-full border border-line bg-white text-xs text-royal font-medium"
                >
                  Driver App
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-1.5 rounded-full border border-line bg-white text-xs text-royal font-medium"
                >
                  Admin Panel
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-line/60 flex flex-col gap-2.5">
            <Button variant="outline" href="/sign-in" onClick={() => setMobileOpen(false)} className="w-full justify-center">
              Sign In
            </Button>
            <Button variant="primary" href="/sign-up" onClick={() => setMobileOpen(false)} className="w-full justify-center">
              Get Started
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}

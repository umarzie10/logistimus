import Image from "next/image";
import { Clock, Package, Truck } from "lucide-react";
import { Button } from "@/components/marketing/ui/Button";

const DEMO_ROWS = [
  { icon: Package, label: "Active shipments", value: "1,284", delta: "+12%" },
  { icon: Truck, label: "Vehicles in transit", value: "362", delta: "+8%" },
  { icon: Clock, label: "On-time deliveries", value: "96.4%", delta: "+2.1%" },
];

export function HeroSection() {
  return (
    <section id="top" className="relative isolate overflow-hidden bg-ice">
      {/* Hero scene — static block on mobile, full-bleed backdrop on desktop */}
      <div className="w-full overflow-hidden lg:absolute lg:inset-0">
        <Image
          src="/images/hero-scene.webp"
          alt="Aerial view of a modern logistics distribution center with trucks at loading docks and organized yard infrastructure"
          width={1920}
          height={1080}
          priority
          className="animate-hero-scene h-[44vh] w-full max-w-full object-cover object-center sm:h-[50vh] lg:h-full lg:object-right-bottom"
        />
      </div>

      <div className="container-page relative flex min-h-[calc(100svh-7rem)] flex-col justify-end pb-16 pt-10 lg:min-h-[92svh] lg:justify-center lg:pb-24 lg:pt-32">
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-start">
          {/* Copy panel — flat overlay block (DESIGN.md §6) */}
          <div className="animate-hero-panel rounded-card border border-line bg-ice p-8 lg:p-10">
            <p className="type-label text-muted">Global logistics operating system</p>
            <h1 className="type-display mt-5">
              Global logistics.
              <br />
              One intelligent
              <br />
              <span className="text-muted">platform.</span>
            </h1>
            <p className="type-body mt-6 text-muted">
              Manage orders, fleets, drivers, warehouses, and financial operations through one
              connected logistics platform.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="/dashboard">
                Explore Platform
                <span aria-hidden="true" className="text-base leading-none">
                  →
                </span>
              </Button>
              <Button variant="outline" href="/sign-up">
                Get Started
              </Button>
            </div>
            <p className="type-mono mt-8 text-muted">
              Multi-company · Multi-currency · Multi-language
            </p>
          </div>

          {/* Floating demo operations card */}
          <aside
            aria-label="Illustrative platform data"
            className="animate-hero-panel rounded-card border border-line bg-ice p-6 lg:mt-2 lg:ml-auto lg:w-[320px]"
            style={{ animationDelay: "160ms" }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-royal">Live operations</p>
              <span className="type-mono rounded-full bg-blue-100 px-2.5 py-1 text-royal">
                DEMO DATA
              </span>
            </div>
            <ul className="mt-5 space-y-4">
              {DEMO_ROWS.map((row) => (
                <li key={row.label} className="flex items-center gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-royal">
                    <row.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-muted">{row.label}</span>
                    <span className="block text-[22px] font-light leading-tight tracking-[-0.02em] text-royal tabular-nums">
                      {row.value}
                    </span>
                  </span>
                  <span className="type-mono flex items-center gap-1 rounded-full bg-success px-2 py-1 text-midnight">
                    <span aria-hidden="true">↑</span>
                    {row.delta}
                  </span>
                </li>
              ))}
            </ul>
            <p className="type-mono mt-5 border-t border-line pt-4 text-muted">
              Illustrative sample values
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

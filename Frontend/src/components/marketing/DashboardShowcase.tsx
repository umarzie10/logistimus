import Image from "next/image";
import { Button } from "@/components/marketing/ui/Button";

export function DashboardShowcase() {
  return (
    <section id="dashboard" className="bg-ice py-20 sm:py-28 lg:py-32 border-b border-[#CFDBEE]/60">
      <div className="container-page">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dbe9f5] border border-[#CFDBEE] text-xs font-mono text-[#0E2F76] uppercase tracking-wider mb-4">
              Operational Command
            </div>
            <h2 className="type-display">
              Complete visibility.
              <br />
              <span className="text-muted">Total control.</span>
            </h2>
          </div>
          <div className="lg:pb-2">
            <p className="type-body text-muted">
              Track orders, fleet, shipments and financial performance in one operational view.
              Every module feeds the same real-time picture of your business.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <Button href="#platform">
                Explore the Platform
                <span aria-hidden="true">→</span>
              </Button>
            </div>
          </div>
        </div>

        {/* High-Resolution 3D Dashboard Showcase */}
        <div className="mt-12 sm:mt-16 relative rounded-card overflow-hidden border border-[#CFDBEE] bg-[#FFFFFF] ">
          <div className="relative w-full aspect-[1536/1024]">
            <Image
              src="/images/dashboard-product.webp"
              alt="Logistimus enterprise SaaS dashboard showing live fleet map, active orders, vehicle tracking and financial metrics"
              fill
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-contain"
              priority
            />
          </div>
        </div>
        <p className="type-mono mt-4 text-muted text-center sm:text-left">
          Illustrative product interface · demo workspace · Tashkent, Samarkand, Bukhara real-time routing
        </p>
      </div>
    </section>
  );
}

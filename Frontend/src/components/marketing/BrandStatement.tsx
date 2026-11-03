import Image from "next/image";
import Link from "next/link";

export function BrandStatement() {
  return (
    <section id="brand" className="relative overflow-hidden bg-ice py-20 sm:py-28 lg:py-32 border-b border-[#CFDBEE]/60">
      {/* Subtle brand geometry */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 600"
        fill="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="1180" cy="140" r="330" stroke="#A9C0E0" strokeWidth="1" opacity="0.35" />
        <circle cx="1180" cy="140" r="450" stroke="#A9C0E0" strokeWidth="1" opacity="0.22" />
        <line x1="0" y1="520" x2="1440" y2="520" stroke="#CFDBEE" strokeWidth="1" />
        <line x1="60" y1="0" x2="60" y2="600" stroke="#CFDBEE" strokeWidth="1" opacity="0.6" />
      </svg>

      <div className="container-page relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dbe9f5] border border-[#CFDBEE] text-xs font-mono text-[#0E2F76] uppercase tracking-wider mb-6">
            Intelligent Connectivity
          </div>
          <h2 className="type-display">
            Your logistics.
            <br />
            Our intelligence.
            <br />
            <span className="text-muted">One connected system.</span>
          </h2>
          <p className="type-body mt-6 text-muted max-w-xl">
            We connect every part of your logistics operations — from orders and fleets to
            warehouses, finance and customers — in one intelligent platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="#platform"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0E2F76] px-6 text-[15px] font-medium text-[#FFFFFF] transition-all hover:bg-[#061336]"
            >
              Explore Platform
              <span aria-hidden="true">→</span>
            </Link>
            <span className="text-xs font-mono text-[#3F5C96]">
              ISO 9001 & 27001 Certified Architecture
            </span>
          </div>
        </div>

        {/* 3D Blue Logistics Truck — Large Hero Scale */}
        <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[520px] flex items-center justify-center p-2 lg:-mr-8">
          <div className="relative w-full h-full flex items-center justify-center">
            <Image
              src="/images/truck-brand-transparent.webp"
              alt="Logistimus 3D Blue Logistics Truck"
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-contain transition-transform duration-300 hover:scale-105 scale-105 lg:scale-115"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

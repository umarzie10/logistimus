import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface Mode {
  id: string;
  name: string;
  badge: string;
  headline: string;
  description: string;
  metric: string;
  metricLabel: string;
  image: string;
  alt: string;
}

const MODES: Mode[] = [
  {
    id: "road",
    name: "Road Freight",
    badge: "Fleet & FTL/LTL",
    headline: "Real-time fleet telematics & automated dispatch",
    description: "Connect dry vans, reefers, flatbeds and container haulers with intelligent dynamic routing and ELD tracking.",
    metric: "1,284+",
    metricLabel: "Active Vehicles Connected",
    image: "/assets/3d/vehicles/truck-container-blue.webp",
    alt: "Logistimus 3D Semi-Truck",
  },
  {
    id: "air",
    name: "Air Cargo",
    badge: "Expedited Priority",
    headline: "Cross-border air manifest & customs clearance",
    description: "Automated flight tracking, unit load device (ULD) balancing, and accelerated priority handling across international hubs.",
    metric: "99.8%",
    metricLabel: "On-Time Flight Schedules",
    image: "/assets/3d/aircraft/cargo-plane.webp",
    alt: "Logistimus 3D Cargo Aircraft",
  },
  {
    id: "sea",
    name: "Ocean Freight",
    badge: "Intermodal FCL/LCL",
    headline: "Global container tracking & port coordination",
    description: "End-to-end maritime visibility from quay cranes to container vessels with automated customs and bill of lading reconciliation.",
    metric: "42 Ports",
    metricLabel: "Direct Terminal Integrations",
    image: "/assets/3d/ships/container-ship.webp",
    alt: "Logistimus 3D Container Vessel",
  },
  {
    id: "rail",
    name: "Rail Transport",
    badge: "High-Volume Bulk",
    headline: "Intermodal rail corridors & wagon tracking",
    description: "Low-carbon, heavy-capacity freight lines with railcar telemetry, siding management, and scheduled junction handoffs.",
    metric: "4.8x",
    metricLabel: "Lower CO2 / Ton-Mile",
    image: "/assets/3d/trains/freight-train.webp",
    alt: "Logistimus 3D Freight Train",
  },
  {
    id: "warehousing",
    name: "Smart Warehousing",
    badge: "WMS & Storage",
    headline: "High-density fulfillment & automated inventory",
    description: "Multi-facility WMS with bin-level tracking, barcode scanner verification, automated weigh station portal and pallet jack dispatch.",
    metric: "99.94%",
    metricLabel: "Inventory Accuracy",
    image: "/assets/3d/warehouses/warehouse-exterior.webp",
    alt: "Logistimus 3D Distribution Center",
  },
];

export function EcosystemSection() {
  return (
    <section id="ecosystem" className="py-20 sm:py-28 bg-[#FFFFFF] border-b border-[#CFDBEE]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dbe9f5] border border-[#CFDBEE] text-xs font-mono text-[#0E2F76] uppercase tracking-wider mb-4">
            Multimodal Operations
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-[#061336] leading-[1.12]">
            One connected ecosystem across road, air, sea, rail and warehousing.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#3F5C96] leading-relaxed">
            Eliminate silos between transport modes. Logistimus unifies diverse carrier networks, shipping manifests, and terminal checkpoints into a single live operational platform.
          </p>
        </div>

        {/* Grid of Modes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODES.map((mode, i) => (
            <div
              key={mode.id}
              className={`group flex flex-col justify-between rounded-card p-6 sm:p-8 bg-white border border-[#CFDBEE] hover:border-[#0E2F76] transition-all duration-200 ${
                i === 0 ? "md:col-span-2 lg:col-span-2" : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-[#FFFFFF] border border-[#CFDBEE] text-[#0E2F76]">
                    {mode.badge}
                  </span>
                  <span className="text-xs font-mono text-[#3F5C96]">0{i + 1}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-light text-[#061336] group-hover:text-[#0E2F76] transition-colors">
                  {mode.name}
                </h3>
                <p className="mt-2 text-sm text-[#3F5C96] leading-relaxed">
                  {mode.description}
                </p>
              </div>

              {/* 3D Visual Asset */}
              <div className="relative my-6 h-44 sm:h-52 w-full flex items-center justify-center overflow-hidden rounded-input bg-white border border-[#CFDBEE]/50 p-4">
                <Image
                  src={mode.image}
                  alt={mode.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  priority
                  loading="eager"
                />
              </div>

              {/* Footer info */}
              <div className="pt-4 border-t border-[#CFDBEE]/60 flex items-end justify-between">
                <div>
                  <div className="text-2xl font-light tabular-nums text-[#061336]">
                    {mode.metric}
                  </div>
                  <div className="text-xs text-[#3F5C96]">
                    {mode.metricLabel}
                  </div>
                </div>
                <Link
                  href="/platform"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#0E2F76] hover:underline"
                >
                  Explore <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/marketing/ui/Button";

const SERVICES = [
  {
    name: "Order Management",
    desc: "Create, manage and track every logistics order in one place.",
    img: "/images/service-order.webp",
  },
  {
    name: "Fleet Management",
    desc: "Monitor vehicles, maintenance schedules and fuel expenses.",
    img: "/images/service-fleet.webp",
  },
  {
    name: "Dispatch & Routing",
    desc: "Plan routes and assign drivers efficiently.",
    img: "/images/service-dispatch.webp",
  },
  {
    name: "Warehouse Management",
    desc: "Control inventory, receiving and shipping.",
    img: "/images/service-warehouse.webp",
  },
  {
    name: "GPS Tracking",
    desc: "Real-time vehicle and shipment tracking.",
    img: "/images/service-gps.webp",
  },
  {
    name: "CRM & Customers",
    desc: "Manage customers, leads, contracts and communication.",
    img: "/images/service-crm.webp",
  },
  {
    name: "Finance & Billing",
    desc: "Invoices, payments, expenses and profit analysis.",
    img: "/images/service-finance.webp",
  },
  {
    name: "Analytics & Intelligence",
    desc: "Real-time operational insights for better decisions.",
    img: "/images/service-analytics.webp",
  },
];

export function ServicesSection() {
  return (
    <section id="platform" className="bg-ice py-24 lg:py-32">
      <div className="container-page">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div>
            <p className="type-label flex items-center gap-3 text-muted">
              <span aria-hidden="true" className="inline-block h-px w-8 bg-powder" />
              One connected ecosystem
            </p>
            <h2 className="type-display mt-6 max-w-[640px]">
              Everything your logistics business needs.
            </h2>
          </div>
          <div className="lg:pb-2">
            <p className="type-body text-muted">
              A complete suite of tools to manage, optimize and grow your logistics operations.
              All in one platform.
            </p>
            <div className="mt-6">
              <Button variant="outline" href="#dashboard">
                View all features
                <span aria-hidden="true">→</span>
              </Button>
            </div>
          </div>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <li key={service.name}>
              <article className="group flex h-full flex-col rounded-card border border-line bg-white p-6 transition-colors duration-150 hover:bg-powder">
                <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-input bg-white">
                  <Image
                    src={service.img}
                    alt={`Illustration for ${service.name}`}
                    width={480}
                    height={360}
                    unoptimized
                    className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-5 text-xl font-medium leading-snug text-royal">
                  {service.name}
                </h3>
                <p className="mt-2 flex-1 text-base leading-relaxed text-muted">
                  {service.desc}
                </p>
                <a
                  href="#dashboard"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-royal transition-colors duration-150 group-hover:text-blue-700"
                >
                  Learn more
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </a>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

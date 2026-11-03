import Image from "next/image";
import { Building2, Check, Globe2, Languages, Plug, Shield } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: Building2,
    title: "Multi-company management",
    desc: "Operate several companies and branches from one account, each with its own isolated data.",
  },
  {
    icon: Globe2,
    title: "Multi-currency support",
    desc: "Bill, pay and report in the currencies your business actually works with.",
  },
  {
    icon: Languages,
    title: "Multi-language interface",
    desc: "Run day-to-day operations in the language each team prefers.",
  },
  {
    icon: Plug,
    title: "Global API integrations",
    desc: "Connect marketplaces, ERP and accounting systems through one documented API.",
  },
  {
    icon: Shield,
    title: "Enterprise-ready architecture",
    desc: "Role-based access, row-level security and audit trails built for scale.",
  },
];

export function GlobalSection() {
  return (
    <section id="global" className="bg-ice py-24 lg:py-32">
      <div className="container-page grid items-center gap-14 lg:grid-cols-2">
        <div>
          <p className="type-label flex items-center gap-3 text-muted">
            <span aria-hidden="true" className="inline-block h-px w-8 bg-powder" />
            Global ecosystem
          </p>
          <h2 className="type-display mt-6">Built for global logistics.</h2>
          <p className="type-body mt-6 text-muted">
            One connected ecosystem for logistics businesses operating across companies,
            countries, currencies and languages.
          </p>

          <ul className="mt-10">
            {HIGHLIGHTS.map((h, i) => (
              <li
                key={h.title}
                className={`flex gap-4 py-5 ${i === 0 ? "border-y" : "border-b"} border-line`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-royal">
                  <h.icon aria-hidden="true" className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-base font-medium text-royal">
                    {h.title}
                    <Check aria-hidden="true" className="h-4 w-4 text-blue-500" />
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{h.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-card border border-line bg-white p-6 lg:p-10">
          <Image
            src="/images/globe.svg"
            alt="Isometric globe connected by global logistics shipping and air trade routes"
            width={660}
            height={660}
            unoptimized
            className="mx-auto w-full max-w-[520px] rounded-card"
          />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-line pt-6">
            {["Companies", "Countries", "Currencies", "Languages"].map((item) => (
              <span key={item} className="type-mono text-muted">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

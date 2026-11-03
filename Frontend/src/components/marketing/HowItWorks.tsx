import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    n: "01",
    title: "Create Order",
    desc: "Capture orders manually or through the API, with customer, cargo and delivery details.",
  },
  {
    n: "02",
    title: "Plan Routes",
    desc: "Build efficient routes around load, distance and delivery window constraints.",
  },
  {
    n: "03",
    title: "Assign Drivers",
    desc: "Assign vehicles and drivers based on availability, capacity and current location.",
  },
  {
    n: "04",
    title: "Track Shipments",
    desc: "Follow every vehicle in real time and share live status with your customers.",
  },
  {
    n: "05",
    title: "Complete Delivery",
    desc: "Record proof of delivery, close the shipment and trigger billing automatically.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-powder py-24 lg:py-32">
      <div className="container-page">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div>
            <p className="type-label flex items-center gap-3 text-royal">
              <span aria-hidden="true" className="inline-block h-px w-8 bg-royal/50" />
              How it works
            </p>
            <h2 className="type-display mt-6">From order to delivery.</h2>
          </div>
          <p className="type-body text-royal lg:pb-2">
            Every shipment follows one connected workflow — from the moment an order is created
            to proof of delivery.
          </p>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.n}>
              <article className="flex h-full flex-col rounded-card border border-line bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="type-mono text-muted">{step.n}</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-line" />
                  {i < STEPS.length - 1 ? (
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-blue-400" />
                  ) : (
                    <span aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                </div>
                <h3 className="mt-4 text-lg font-medium leading-snug text-royal">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.desc}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

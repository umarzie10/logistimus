import Image from "next/image";
import { Clock, Fuel, Gauge, Route, Sparkles, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: Clock,
    title: "Predict potential delivery delays",
    desc: "Detect at-risk shipments before they fall behind schedule.",
  },
  {
    icon: Route,
    title: "Recommend efficient routes",
    desc: "Surface faster, cheaper routes from historical trip data.",
  },
  {
    icon: Gauge,
    title: "Identify operational inefficiencies",
    desc: "Spot recurring bottlenecks across dispatch, fleet and warehouse.",
  },
  {
    icon: Fuel,
    title: "Analyze fuel and fleet expenses",
    desc: "Break down spend per vehicle, route and reporting period.",
  },
  {
    icon: TrendingUp,
    title: "Provide business performance insight",
    desc: "Summarize revenue, margin and utilization trends across the company.",
  },
];

export function AISection() {
  return (
    <section id="ai" className="bg-midnight py-24 text-ice lg:py-32">
      <div className="container-page grid items-center gap-14 lg:grid-cols-2">
        <div>
          <p className="type-label flex items-center gap-3 text-powder">
            <span aria-hidden="true" className="inline-block h-px w-8 bg-powder/60" />
            AI-assisted intelligence
          </p>
          <h2 className="type-display mt-6">
            Make smarter logistics
            <br />
            <span className="text-powder">decisions.</span>
          </h2>
          <p className="type-body mt-6 text-blue-200">
            Turn operational data into actionable insights with AI-assisted logistics
            intelligence.
          </p>

          <ul className="mt-10 space-y-6">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-700 bg-blue-900 text-powder">
                  <f.icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-base font-medium text-ice">{f.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-blue-200">
                    {f.desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex gap-3.5 rounded-card border border-blue-700 bg-blue-900 p-5">
            <Sparkles aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-powder" />
            <p className="text-sm leading-relaxed text-blue-200">
              AI in Logistimus is an assistant, not an autopilot. Every recommendation stays
              under your team&apos;s control before it becomes an action.
            </p>
          </div>
        </div>

        <div className="rounded-card border border-blue-700 bg-blue-950 p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-ice">Logistics network view</p>
            <span className="type-mono rounded-full bg-blue-900 px-2.5 py-1 text-powder">
              ILLUSTRATIVE
            </span>
          </div>
          <Image
            src="/images/ai-network.svg"
            alt="Isometric artificial intelligence neural network for global logistics optimization"
            width={640}
            height={540}
            unoptimized
            className="mx-auto w-full max-w-[520px] object-contain"
          />
          <ul className="mt-4 flex flex-wrap gap-2">
            {["Delay alerts", "Route suggestions", "Cost insights", "Performance summaries"].map(
              (chip) => (
                <li
                  key={chip}
                  className="type-mono rounded-full border border-blue-700 px-3 py-1 text-blue-200"
                >
                  {chip}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

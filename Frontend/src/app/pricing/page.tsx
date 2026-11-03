"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Check, ArrowRight, HelpCircle } from "lucide-react";

const TIERS = [
  {
    name: "Starter Fleet",
    badge: "Regional Haulers",
    priceMonthly: "$240",
    priceAnnual: "$190",
    period: "/ month",
    description: "Designed for expanding carriers managing up to 30 vehicles on regional corridors.",
    features: [
      "Up to 30 connected vehicles",
      "Real-time GPS telematics tracking",
      "Automated dispatch board",
      "Driver mobile application access",
      "Standard fuel consumption reports",
      "Email & ticket support (8h SLA)",
    ],
    cta: "Start 14-Day Free Trial",
    href: "/sign-up?tier=starter",
    popular: false,
  },
  {
    name: "Growth Logistics",
    badge: "Most Popular",
    priceMonthly: "$690",
    priceAnnual: "$550",
    period: "/ month",
    description: "Full-scale logistics operating system for fleets of 30 to 150 trucks and multiple depots.",
    features: [
      "Up to 150 connected vehicles",
      "Advanced multi-stop route optimization",
      "Full WMS & dock bay scheduling",
      "Client tracking portal with custom logo",
      "Automated invoicing & carrier settlements",
      "AI delay prediction & weather rerouting",
      "Priority 24/7 technical support (2h SLA)",
      "REST API & Webhook integrations",
    ],
    cta: "Start 14-Day Free Trial",
    href: "/sign-up?tier=growth",
    popular: true,
  },
  {
    name: "Enterprise Global",
    badge: "Multinational",
    priceMonthly: "$1,850",
    priceAnnual: "$1,480",
    period: "/ month",
    description: "Custom multimodal logistics infrastructure for large carrier groups, rail and ocean operators.",
    features: [
      "Unlimited connected vehicles & assets",
      "Multimodal freight: Road, Air, Sea & Rail",
      "Multi-tenant company & branch hierarchies",
      "Custom ERP integration (SAP, Oracle, 1C)",
      "Dedicated account manager & solutions engineer",
      "Custom SLA with 99.99% uptime guarantee",
      "On-premise or sovereign cloud deployment",
      "Custom AI model fine-tuning on your routes",
    ],
    cta: "Contact Enterprise Sales",
    href: "/sign-up?tier=enterprise",
    popular: false,
  },
];

const FAQS = [
  {
    q: "Can I switch plans or cancel at any time?",
    a: "Yes. All subscriptions are billed monthly or annually. You can upgrade, downgrade, or cancel your subscription anytime with zero hidden penalty fees.",
  },
  {
    q: "Is there a free trial period?",
    a: "We offer a full-featured 14-day free trial on Starter and Growth plans. No credit card is required to sign up and configure your fleet.",
  },
  {
    q: "What ELD hardware and telematics sensors are supported?",
    a: "Logistimus supports over 80 major OBD-II and CAN-bus telematics devices, including Teltonika, Geotab, Samsara, and Garmin, as well as smartphone GPS tracking.",
  },
  {
    q: "Do you support multi-currency billing and local tax invoices?",
    a: "Yes. Logistimus natively manages USD, EUR, UZS, KZT, and RUB with automated tax calculations, electronic VAT receipts, and bank reconciliation.",
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      <Navbar />
      <main className="bg-ice min-h-screen pt-28 pb-20 sm:pb-28">
        <div className="container-page">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dbe9f5] border border-[#CFDBEE] text-xs font-mono text-[#0E2F76] uppercase tracking-wider mb-4">
              Predictable Enterprise Pricing
            </div>
            <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-[#061336] leading-[1.15]">
              Transparent pricing for logistics businesses of every scale.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-[#3F5C96] leading-relaxed">
              No hidden fees. No per-user penalties. Scale your carrier operations, warehouses and dispatchers with confidence.
            </p>

            {/* Billing Cycle Toggle */}
            <div className="mt-8 inline-flex items-center p-1 rounded-full bg-[#FFFFFF] border border-[#CFDBEE] ">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-all ${
                  !annual ? "bg-[#0E2F76] text-[#FFFFFF] " : "text-[#3F5C96] hover:text-[#061336]"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-medium transition-all ${
                  annual ? "bg-[#0E2F76] text-[#FFFFFF] " : "text-[#3F5C96] hover:text-[#061336]"
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-success/15 text-midnight">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-20">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-card p-8 flex flex-col justify-between transition-all duration-200 ${
                  tier.popular
                    ? "bg-[#061336] text-[#FFFFFF] border-2 border-[#0E2F76] relative lg:-translate-y-2"
                    : "bg-[#FFFFFF] text-[#061336] border border-[#CFDBEE] hover:border-[#0E2F76]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full ${
                        tier.popular
                          ? "bg-blue-500 text-[#FFFFFF]"
                          : "bg-[#dbe9f5] text-[#0E2F76]"
                      }`}
                    >
                      {tier.badge}
                    </span>
                  </div>
                  <h3 className="text-2xl font-light">{tier.name}</h3>
                  <p
                    className={`mt-2 text-xs leading-relaxed ${
                      tier.popular ? "text-[#A9C0E0]" : "text-[#3F5C96]"
                    }`}
                  >
                    {tier.description}
                  </p>

                  <div className="mt-6 pb-6 border-b border-[#CFDBEE]/30 flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-light tabular-nums">
                      {annual ? tier.priceAnnual : tier.priceMonthly}
                    </span>
                    <span
                      className={`text-xs font-mono ${
                        tier.popular ? "text-[#A9C0E0]" : "text-[#3F5C96]"
                      }`}
                    >
                      {tier.period}
                    </span>
                  </div>

                  {/* Features List */}
                  <div className="mt-6 space-y-3">
                    <div
                      className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                        tier.popular ? "text-[#A9C0E0]" : "text-[#3F5C96]"
                      }`}
                    >
                      Included Capabilities
                    </div>
                    {tier.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5 text-xs">
                        <Check
                          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            tier.popular ? "text-success" : "text-midnight"
                          }`}
                        />
                        <span className={tier.popular ? "text-[#F4FEFF]" : "text-[#061336]"}>
                          {f}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <Link
                    href={tier.href}
                    className={`w-full py-3 px-4 rounded-full font-medium text-xs flex items-center justify-center gap-2 transition-all ${
                      tier.popular
                        ? "bg-[#8aa3cb] hover:bg-[#a9c0e0] text-[#061336]"
                        : "bg-[#0E2F76] hover:bg-[#061336] text-[#FFFFFF]"
                    }`}
                  >
                    {tier.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto rounded-card bg-[#FFFFFF] border border-[#CFDBEE] p-8 sm:p-12 ">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-[#061336]">Frequently Asked Questions</h2>
              <p className="text-xs text-[#3F5C96] mt-1">Everything you need to know about enterprise licensing and terms</p>
            </div>

            <div className="divide-y divide-[#CFDBEE]/60 space-y-4">
              {FAQS.map((faq, i) => (
                <div key={i} className="pt-4 first:pt-0">
                  <h3 className="text-sm font-light text-[#061336] flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#0E2F76] flex-shrink-0" />
                    {faq.q}
                  </h3>
                  <p className="mt-1.5 text-xs text-[#3F5C96] leading-relaxed pl-6">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

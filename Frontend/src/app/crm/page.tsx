"use client";

import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app/AppShell";
import { ArrowUpRight, Plus, X, Building2, FileText, CheckCircle2 } from "lucide-react";

interface Customer {
  name: string;
  industry: string;
  contact: string;
  email: string;
  activeShipments: number;
  monthlyVolume: string;
  slaScore: string;
  contract: string;
}

const INITIAL_CUSTOMERS: Customer[] = [
  {
    name: "Northwind Freight Corp",
    industry: "Consumer Electronics & Tech",
    contact: "Elena Rostova (Supply Chain VP)",
    email: "elena@northwindfreight.com",
    activeShipments: 14,
    monthlyVolume: "$184,000",
    slaScore: "99.4%",
    contract: "Tier 1 Priority SLA",
  },
  {
    name: "Axis Distribution Group",
    industry: "Pharmaceuticals & Healthcare",
    contact: "Farrukh Aliyev (Logistics Head)",
    email: "f.aliyev@axisdist.uz",
    activeShipments: 8,
    monthlyVolume: "$96,500",
    slaScore: "98.9%",
    contract: "GDP Cold-Chain Certified",
  },
  {
    name: "Meridian Cargo LLC",
    industry: "Industrial Metallurgy & Heavy Machinery",
    contact: "Timur Kasymov (Procurement Lead)",
    email: "t.kasymov@meridiancargo.kz",
    activeShipments: 22,
    monthlyVolume: "$320,000",
    slaScore: "97.8%",
    contract: "Multi-Year Rail & Road Agreement",
  },
  {
    name: "Bluepeak Retail Stores",
    industry: "FMCG & Supermarket Chains",
    contact: "Nodira Karimova (Distribution Director)",
    email: "nodira@bluepeak.uz",
    activeShipments: 19,
    monthlyVolume: "$145,000",
    slaScore: "96.5%",
    contract: "Daily Last-Mile Replenishment",
  },
];

export default function CRMPage() {
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<Customer | null>(null);

  // New Customer Form State
  const [formName, setFormName] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formContract, setFormContract] = useState("Tier 1 Priority SLA");
  const [formError, setFormError] = useState("");

  const handleAddCustomer = (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formContact.trim() || !formEmail.trim()) {
      setFormError("Please fill out company name, contact, and email.");
      return;
    }
    const newCust: Customer = {
      name: formName.trim(),
      industry: formIndustry.trim() || "General Logistics",
      contact: formContact.trim(),
      email: formEmail.trim(),
      activeShipments: 0,
      monthlyVolume: "$0",
      slaScore: "100.0%",
      contract: formContract,
    };
    setCustomers((prev) => [newCust, ...prev]);
    setFormName("");
    setFormIndustry("");
    setFormContact("");
    setFormEmail("");
    setFormError("");
    setModalOpen(false);
  };

  return (
    <AppShell
      title="Customer CRM & Accounts"
      subtitle="Enterprise shipping clients, contractual SLAs, contacts and volume billing"
    >
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs text-[#3F5C96]">
          Total Active Enterprise Clients: <strong>{customers.length + 80} Companies</strong>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium hover:bg-[#061336] transition-colors"
        >
          <Plus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customers.map((c) => (
          <div
            key={c.name}
            className="p-5 sm:p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between pb-3 border-b border-[#CFDBEE]/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-input bg-[#dbe9f5] text-[#0E2F76] flex items-center justify-center font-semibold text-sm">
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <h3 className="font-light text-base text-[#061336]">{c.name}</h3>
                    <p className="text-xs text-[#3F5C96]">{c.industry}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#0E2F76] border border-blue-200">
                  {c.contract}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-input bg-[#ffffff] border border-[#CFDBEE]/60">
                  <span className="text-[10px] text-[#3F5C96] block">Active Dispatches</span>
                  <span className="font-mono font-semibold text-sm text-[#0E2F76]">
                    {c.activeShipments} Shipments
                  </span>
                </div>
                <div className="p-3 rounded-input bg-[#ffffff] border border-[#CFDBEE]/60">
                  <span className="text-[10px] text-[#3F5C96] block">Monthly Run Rate</span>
                  <span className="font-mono font-semibold text-sm text-midnight">
                    {c.monthlyVolume}
                  </span>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-input bg-[#ffffff] border border-[#CFDBEE]/60 space-y-1.5 text-xs text-[#3F5C96]">
                <div>
                  Primary Contact: <strong className="text-[#061336]">{c.contact}</strong>
                </div>
                <div>
                  Email: <strong className="text-[#0E2F76]">{c.email}</strong>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#CFDBEE]/60 mt-4 flex items-center justify-between text-xs">
              <span className="font-mono text-midnight font-semibold">
                SLA Achievement: {c.slaScore}
              </span>
              <button
                type="button"
                onClick={() => setSelectedLedger(c)}
                className="font-medium text-[#0E2F76] hover:underline flex items-center gap-1"
              >
                View Account Ledger <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Account Ledger Modal */}
      {selectedLedger && (
        <div className="fixed inset-0 z-50 bg-[#061336]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-card border border-[#CFDBEE] p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0E2F76]" />
                <div>
                  <h3 className="font-light text-base text-[#061336]">{selectedLedger.name}</h3>
                  <span className="text-xs text-[#3F5C96]">Account Ledger & Billing History</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLedger(null)}
                aria-label="Close ledger"
                className="p-1 rounded-full text-[#3F5C96] hover:bg-[#dbe9f5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-input bg-[#dbe9f5]">
                <div className="text-[10px] text-[#3F5C96]">Monthly Run Rate</div>
                <div className="font-mono font-semibold text-sm text-[#0E2F76] mt-0.5">
                  {selectedLedger.monthlyVolume}
                </div>
              </div>
              <div className="p-2.5 rounded-input bg-success/15 border border-success/40">
                <div className="text-[10px] text-midnight">SLA Rate</div>
                <div className="font-mono font-semibold text-sm text-midnight mt-0.5">
                  {selectedLedger.slaScore}
                </div>
              </div>
              <div className="p-2.5 rounded-input bg-[#dbe9f5]">
                <div className="text-[10px] text-[#3F5C96]">Active Loads</div>
                <div className="font-mono font-semibold text-sm text-[#061336] mt-0.5">
                  {selectedLedger.activeShipments}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-semibold text-[#061336] block">Recent Settlement Records</span>
              <div className="p-3 rounded-input border border-[#CFDBEE] bg-[#ffffff] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[#0E2F76] font-semibold">INV-2026-OCT-84</span>
                  <span className="font-semibold text-midnight flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Settled
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#3F5C96] text-[11px]">
                  <span>Contract: {selectedLedger.contract}</span>
                  <span className="font-mono">Terms: Net 30</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#CFDBEE]">
              <button
                type="button"
                onClick={() => setSelectedLedger(null)}
                className="px-4 py-2 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#061336]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-card border border-[#CFDBEE] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0E2F76]" />
                <h3 className="font-light text-base text-[#061336]">Onboard New Enterprise Account</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setFormError("");
                }}
                className="p-1 rounded-full text-[#3F5C96] hover:bg-[#dbe9f5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-input bg-danger/15 border border-danger/40 text-midnight text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Company / Legal Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Silk Road Logistics Corp"
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] focus:outline-none focus:border-[#0E2F76]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#061336] mb-1">Industry Vertical</label>
                <input
                  type="text"
                  value={formIndustry}
                  onChange={(e) => setFormIndustry(e.target.value)}
                  placeholder="e.g. FMCG & Retail Distribution"
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] focus:outline-none focus:border-[#0E2F76]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    placeholder="e.g. Jasur Aliyev"
                    className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] focus:outline-none focus:border-[#0E2F76]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Work Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="jasur@silkroad.uz"
                    className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] focus:outline-none focus:border-[#0E2F76]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#061336] mb-1">Contract / SLA Tier</label>
                <select
                  value={formContract}
                  onChange={(e) => setFormContract(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] focus:outline-none"
                >
                  <option value="Tier 1 Priority SLA">Tier 1 Priority SLA (99.5% Guarantee)</option>
                  <option value="Growth Standard SLA">Growth Standard SLA (98.0% Guarantee)</option>
                  <option value="Cold-Chain Certified SLA">Cold-Chain Certified SLA</option>
                  <option value="Custom Enterprise Frame">Custom Enterprise Frame</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#CFDBEE]">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setFormError("");
                  }}
                  className="px-4 py-2 rounded-full border border-[#CFDBEE] text-xs font-medium text-[#3F5C96]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium hover:bg-[#061336]"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

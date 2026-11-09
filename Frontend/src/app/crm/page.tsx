"use client";

import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Plus, X, Building2, Users } from "lucide-react";

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

export default function CRMPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("Industrial Manufacturing");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");

  const handleCreateCustomer = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newCust: Customer = {
      name: name.trim(),
      industry: industry,
      contact: contact.trim() || "Account Representative",
      email: email.trim(),
      activeShipments: 0,
      monthlyVolume: "Pending Billing",
      slaScore: "100%",
      contract: "Standard Freight Agreement",
    };

    setCustomers((prev) => [newCust, ...prev]);
    setName("");
    setContact("");
    setEmail("");
    setModalOpen(false);
  };

  return (
    <AppShell title="Customer & Shipper Accounts" subtitle="Maintain corporate shipper accounts, enterprise contracts, and delivery SLAs">
      {/* Top Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Shipper Accounts</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">{customers.length} Accounts</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Workspace Clients</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Active Contracts</div>
          <div className="text-2xl font-light tabular-nums text-[#0E2F76] mt-1">{customers.length} Contracts</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">SLA Enforced</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">CRM Subsystem</div>
          <div className="text-2xl font-light tabular-nums text-blue-600 mt-1">Scheduled</div>
          <div className="text-xs text-blue-700 mt-0.5 font-medium">Phase 7 CRM Engine</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Tenant Scope</div>
          <div className="text-2xl font-light tabular-nums text-royal mt-1">Active</div>
          <div className="text-xs text-muted mt-0.5 font-medium">Isolated per Organization</div>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-xs font-medium text-[#FFFFFF]"
        >
          <Plus className="w-4 h-4" /> Add Shipper Account
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="bg-[#FFFFFF] rounded-card border border-[#CFDBEE] p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F4FEFF] border border-[#CFDBEE] text-[#0E2F76] flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-light text-[#061336]">No Shipper Accounts Registered in Workspace</h2>
          <p className="text-xs text-[#3F5C96] max-w-md mx-auto leading-relaxed">
            Corporate customer accounts, billing contacts, and rate sheets will populate when shippers are onboarded. CRM models land in backend Phase 7.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336]"
            >
              <Plus className="w-3.5 h-3.5" /> Add First Customer
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customers.map((c) => (
            <div key={c.email} className="p-5 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]/60">
                <div>
                  <h3 className="font-semibold text-sm text-[#061336]">{c.name}</h3>
                  <div className="text-xs text-[#3F5C96]">{c.industry}</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-success text-midnight border border-success">
                  {c.contract}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#3F5C96]">Contact Lead:</span>
                  <div className="font-semibold text-[#061336]">{c.contact}</div>
                </div>
                <div>
                  <span className="text-[#3F5C96]">Corporate Email:</span>
                  <div className="font-mono text-[#061336]">{c.email}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#061336]/65 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-card border border-[#CFDBEE] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
              <h2 className="font-light text-base text-[#061336]">Onboard Shipper Account</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[#3F5C96]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Company / Shipper Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samarkand Industrial Group"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="logistics@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="Procurement Manager"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#CFDBEE]">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 rounded-full border border-[#CFDBEE] text-[#3F5C96]">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0E2F76] text-white font-medium hover:bg-[#061336]">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

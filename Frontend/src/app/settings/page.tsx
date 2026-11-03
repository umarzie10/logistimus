"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const [rotateNotice, setRotateNotice] = useState(false);
  return (
    <AppShell title="Organization & Platform Settings" subtitle="Company identity, branch networks, user access control and developer API keys">
      <div className="max-w-4xl space-y-6">
        {/* Company Profile Card */}
        <div className="p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <h3 className="font-light text-base text-[#061336] mb-1">Company Profile</h3>
          <p className="text-xs text-[#3F5C96] mb-5">Primary operational entity settings and tax identifiers</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#061336] mb-1">Legal Entity Name</label>
              <input type="text" defaultValue="Logistimus Global Cargo LLC" className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff]" />
            </div>
            <div>
              <label className="block font-semibold text-[#061336] mb-1">Tax ID / INN</label>
              <input type="text" defaultValue="UZ 309 482 114" className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff]" />
            </div>
            <div>
              <label className="block font-semibold text-[#061336] mb-1">Headquarters Address</label>
              <input type="text" defaultValue="42 Amir Timur Avenue, Tashkent" className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff]" />
            </div>
            <div>
              <label className="block font-semibold text-[#061336] mb-1">Base Currency</label>
              <select className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff]">
                <option>USD ($) - United States Dollar</option>
                <option>UZS (so’m) - Uzbek Som</option>
                <option>EUR (€) - Euro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Branch Network */}
        <div className="p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <h3 className="font-light text-base text-[#061336] mb-1">Regional Branch Terminals</h3>
          <p className="text-xs text-[#3F5C96] mb-4">Active operational distribution terminals under this account</p>

          <div className="space-y-3">
            {[
              { name: "Tashkent Central Distribution Terminal 01", type: "Main Terminal & Cross-dock", status: "Primary" },
              { name: "Samarkand Regional Logistics Hub", type: "Distribution & Storage", status: "Active" },
              { name: "Bukhara Cold-Chain Depot", type: "Reefer & GDP Certified", status: "Active" },
              { name: "Navoi Free Zone Freight Depot", type: "Multimodal Rail-Air Link", status: "Active" },
            ].map((b) => (
              <div key={b.name} className="p-3.5 rounded-input bg-[#ffffff] border border-[#CFDBEE] flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[#061336]">{b.name}</div>
                  <div className="text-[#3F5C96] text-[11px]">{b.type}</div>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#0E2F76] font-semibold border border-blue-200">
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Developer API & Integrations */}
        <div className="p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <h3 className="font-light text-base text-[#061336] mb-1">Live Developer API Keys</h3>
          <p className="text-xs text-[#3F5C96] mb-4">Integrate Logistimus telemetry directly into your ERP, WMS, or TMS systems</p>

          <div className="p-3.5 rounded-input bg-[#ffffff] border border-[#CFDBEE] flex items-center justify-between text-xs">
            <div>
              <div className="font-mono font-semibold text-[#061336]">prod_live_849204928174910284</div>
              <div className="text-[10px] text-[#3F5C96] mt-0.5">Created Oct 15, 2026 · Permissions: Read/Write Orders, Telematics</div>
            </div>
            <button
              type="button"
              onClick={() => setRotateNotice(true)}
              aria-expanded={rotateNotice}
              className="text-xs font-medium text-[#0E2F76] hover:underline"
            >
              Rotate Key
            </button>
          </div>
          {rotateNotice && (
            <div
              role="status"
              className="mt-3 p-3 rounded-input bg-warning/15 border border-warning/40 flex items-start gap-2 text-xs"
            >
              <ShieldAlert className="w-4 h-4 text-midnight flex-shrink-0 mt-0.5" aria-hidden />
              <div className="text-midnight">
                <span className="font-semibold">Backend required</span>
                <p className="mt-0.5">
                  API key rotation is confirmed server-side. This demo frontend has no backend
                  connection, so the key above was not changed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

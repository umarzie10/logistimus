"use client";

import Link from "next/link";
import Image from "next/image";

const ORGANIZATIONS = [
  { name: "TransAsia Freight LLC", tier: "Enterprise Unlimited", fleet: "362 Trucks", users: "48 Users", mrr: "$4,800/mo", status: "Active" },
  { name: "Silk Road Logistics Group", tier: "Growth Pro", fleet: "120 Trucks", users: "18 Users", mrr: "$2,200/mo", status: "Active" },
  { name: "Meridian Cargo Kazakhstan", tier: "Enterprise Custom", fleet: "480 Rail/Truck", users: "64 Users", mrr: "$6,500/mo", status: "Active" },
  { name: "Bukhara Cold Express", tier: "Starter Fleet", fleet: "24 Reefers", users: "6 Users", mrr: "$850/mo", status: "Active" },
];

export default function SuperAdminPage() {
  return (
    <div className="min-h-screen bg-[#061336] text-[#FFFFFF]">
      {/* Super Admin Topbar */}
      <header className="h-16 border-b border-[#2a4a8e] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-7 h-7">
            <Image src="/logo-transparent.png" alt="Logistimus" fill className="object-contain" />
          </div>
          <span className="font-semibold text-base tracking-tight text-[#FFFFFF]">Logistimus SuperAdmin OS</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-danger/20 text-danger font-semibold border border-danger/30">
            ROOT LEVEL
          </span>
        </div>
        <Link href="/dashboard" className="text-xs font-medium text-[#A9C0E0] hover:text-[#FFFFFF] underline">
          Switch to Tenant App →
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Global Platform KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-card bg-[#0E2F76]/40 border border-[#2a4a8e]">
            <div className="text-[11px] font-mono uppercase text-[#A9C0E0]">Total Tenants</div>
            <div className="text-2xl font-light tabular-nums text-[#FFFFFF] mt-1">142 Organizations</div>
            <div className="text-xs text-success mt-1">+8 new this month</div>
          </div>
          <div className="p-5 rounded-card bg-[#0E2F76]/40 border border-[#2a4a8e]">
            <div className="text-[11px] font-mono uppercase text-[#A9C0E0]">Platform MRR</div>
            <div className="text-2xl font-light tabular-nums text-[#FFFFFF] mt-1">$284,500</div>
            <div className="text-xs text-success mt-1">Annual Run Rate: $3.4M</div>
          </div>
          <div className="p-5 rounded-card bg-[#0E2F76]/40 border border-[#2a4a8e]">
            <div className="text-[11px] font-mono uppercase text-[#A9C0E0]">Connected Telematics</div>
            <div className="text-2xl font-light tabular-nums text-[#FFFFFF] mt-1">8,420 Units</div>
            <div className="text-xs text-blue-300 mt-1">4.2M GPS pings / day</div>
          </div>
          <div className="p-5 rounded-card bg-[#0E2F76]/40 border border-[#2a4a8e]">
            <div className="text-[11px] font-mono uppercase text-[#A9C0E0]">System SLA</div>
            <div className="text-2xl font-light tabular-nums text-success mt-1">99.98%</div>
            <div className="text-xs text-[#A9C0E0] mt-1">Global latency: 42ms</div>
          </div>
        </div>

        {/* Tenant Table */}
        <div className="p-6 rounded-card bg-[#061336] border border-[#2a4a8e]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-light text-base text-[#FFFFFF]">Tenant Organizations</h3>
            <span className="text-xs font-mono text-[#A9C0E0]">Database Sharding: Postgres Multitenant</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2a4a8e] text-[10px] font-mono uppercase text-[#A9C0E0]">
                  <th className="pb-3">Organization</th>
                  <th className="pb-3">Subscription Tier</th>
                  <th className="pb-3">Connected Fleet</th>
                  <th className="pb-3">Seats</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a4a8e]/60">
                {ORGANIZATIONS.map((org) => (
                  <tr key={org.name} className="hover:bg-[#0E2F76]/30">
                    <td className="py-3 font-semibold text-[#FFFFFF]">{org.name}</td>
                    <td className="py-3 text-[#A9C0E0] font-mono">{org.tier}</td>
                    <td className="py-3 font-mono text-[#FFFFFF]">{org.fleet}</td>
                    <td className="py-3 text-[#A9C0E0]">{org.users}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-[10px] font-semibold border border-success/30">
                        {org.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-semibold text-success">{org.mrr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Phone, Clock, X, ShieldCheck } from "lucide-react";

interface Driver {
  name: string;
  id: string;
  experience: string;
  license: string;
  assigned: string;
  onTimeRate: string;
  safetyScore: string;
  phone: string;
  status: string;
  statusClass: string;
}

const DRIVERS: Driver[] = [
  {
    name: "Akmal Saidov",
    id: "DRV-102",
    experience: "12 years",
    license: "Cat CE · ADR Certified",
    assigned: "TRK-01 (Volvo FH540)",
    onTimeRate: "98.8%",
    safetyScore: "99/100",
    phone: "+998 90 234 56 78",
    status: "Active Route (Tashkent → Samarkand)",
    statusClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    name: "Bobur Turgunov",
    id: "DRV-108",
    experience: "8 years",
    license: "Cat CE · Reefer Specialist",
    assigned: "REEFER-04 (Scania R450)",
    onTimeRate: "97.4%",
    safetyScore: "96/100",
    phone: "+998 91 345 67 89",
    status: "Loading at Dock 2",
    statusClass: "bg-warning/15 text-midnight border-warning/40",
  },
  {
    name: "Otabek Qodirov",
    id: "DRV-114",
    experience: "15 years",
    license: "Cat CE · ADR Tanker Master",
    assigned: "TANK-03 (Mercedes Actros)",
    onTimeRate: "99.2%",
    safetyScore: "100/100",
    phone: "+998 93 456 78 90",
    status: "Resting (Yard Available)",
    statusClass: "bg-success/15 text-midnight border-success/40",
  },
  {
    name: "Jasur Mirzayev",
    id: "DRV-122",
    experience: "5 years",
    license: "Cat C · Urban Logistics",
    assigned: "VAN-08 (Iveco Daily)",
    onTimeRate: "96.5%",
    safetyScore: "95/100",
    phone: "+998 97 567 89 01",
    status: "Active Route (Bukhara Central)",
    statusClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
];

export default function DriversPage() {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  return (
    <AppShell title="Driver Management" subtitle="Driver roster, regulatory licensing, duty hours and safety scorecards">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Active Drivers</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">214 Drivers</div>
          <div className="text-xs text-midnight mt-0.5 font-medium">100% Valid Medicals</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">On Highway Duty</div>
          <div className="text-2xl font-light tabular-nums text-blue-600 mt-1">168 Drivers</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Under live ELD monitoring</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Fleet Safety Score</div>
          <div className="text-2xl font-light tabular-nums text-midnight mt-1">98.2 / 100</div>
          <div className="text-xs text-midnight mt-0.5 font-medium">Zero critical violations</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Duty Hours Avg</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">6.8 hrs / day</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Compliant with DOT rules</div>
        </div>
      </div>

      {/* Driver Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DRIVERS.map((d) => (
          <div key={d.id} className="p-5 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between pb-3 border-b border-[#CFDBEE]/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0E2F76] text-[#FFFFFF] flex items-center justify-center font-semibold text-sm">
                    {d.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="font-light text-sm text-[#061336]">{d.name}</h3>
                    <div className="text-xs font-mono text-[#3F5C96]">{d.id} · {d.experience} exp</div>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${d.statusClass}`}>
                  {d.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-input bg-[#ffffff] border border-[#CFDBEE]/60">
                  <div className="text-[10px] text-[#3F5C96]">Assigned Vehicle</div>
                  <div className="font-semibold text-[#0E2F76] mt-0.5">{d.assigned}</div>
                </div>
                <div className="p-2.5 rounded-input bg-[#ffffff] border border-[#CFDBEE]/60">
                  <div className="text-[10px] text-[#3F5C96]">License Tier</div>
                  <div className="font-semibold text-[#061336] mt-0.5">{d.license}</div>
                </div>
                <div className="p-2.5 rounded-input bg-[#ffffff] border border-[#CFDBEE]/60">
                  <div className="text-[10px] text-[#3F5C96]">On-Time Delivery Rate</div>
                  <div className="font-mono font-semibold text-midnight mt-0.5">{d.onTimeRate}</div>
                </div>
                <div className="p-2.5 rounded-input bg-[#ffffff] border border-[#CFDBEE]/60">
                  <div className="text-[10px] text-[#3F5C96]">Safety Index</div>
                  <div className="font-mono font-semibold text-blue-600 mt-0.5">{d.safetyScore}</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#CFDBEE]/60 mt-4 flex items-center justify-between text-xs text-[#3F5C96]">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {d.phone}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDriver(d)}
                className="font-medium text-[#0E2F76] hover:underline"
              >
                View Logbook →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Driver Logbook Inspection Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 bg-[#061336]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-card border border-[#CFDBEE] p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
              <div>
                <h3 className="font-light text-base text-[#061336]">
                  {selectedDriver.name} · ELD Logbook
                </h3>
                <span className="text-xs font-mono text-[#3F5C96]">
                  Driver ID: {selectedDriver.id} · {selectedDriver.assigned}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="p-1 rounded-full text-[#3F5C96] hover:bg-[#dbe9f5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-input bg-[#dbe9f5]">
                <div className="text-[10px] text-[#3F5C96]">Hours Driven (Today)</div>
                <div className="font-mono font-semibold text-sm text-[#0E2F76] mt-0.5">5h 24m</div>
              </div>
              <div className="p-2.5 rounded-input bg-[#dbe9f5]">
                <div className="text-[10px] text-[#3F5C96]">Hours Remaining</div>
                <div className="font-mono font-semibold text-sm text-[#061336] mt-0.5">3h 36m</div>
              </div>
              <div className="p-2.5 rounded-input bg-success/15 border border-success/40">
                <div className="text-[10px] text-midnight">Safety Index</div>
                <div className="font-mono font-semibold text-sm text-midnight mt-0.5">
                  {selectedDriver.safetyScore}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-semibold text-[#061336] block">Recent Duty Timeline</span>
              <div className="p-3 rounded-input border border-[#CFDBEE] bg-[#ffffff] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-[#061336]">
                    <Clock className="w-3.5 h-3.5 text-[#0E2F76]" /> 06:30 — Pre-trip Inspection
                  </span>
                  <span className="font-mono text-midnight flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-success" /> Passed
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#3F5C96] text-[11px]">
                  <span>07:00 — On-Duty Driving (Highway M-39)</span>
                  <span className="font-mono">Current segment: 284 km</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#CFDBEE]">
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="px-4 py-2 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium"
              >
                Close Logbook
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

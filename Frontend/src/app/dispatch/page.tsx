"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Check, X, Compass } from "lucide-react";

interface DispatchLane {
  id: string;
  lane: string;
  dist: string;
  duration: string;
  vehicle: string;
  driver: string;
  cargo: string;
  status: string;
  progress: number;
  statusColor: string;
}

const INITIAL_DISPATCH_LANES: DispatchLane[] = [
  {
    id: "DSP-8801",
    lane: "Tashkent (M-39) → Samarkand Terminal",
    dist: "310 km",
    duration: "4h 25m",
    vehicle: "TRK-01 (Volvo FH540)",
    driver: "Akmal Saidov",
    cargo: "High-value electronics (14,200 kg)",
    status: "Active on route",
    progress: 68,
    statusColor: "bg-blue-500",
  },
  {
    id: "DSP-8802",
    lane: "Navoi Free Zone → Bukhara Logistics Hub",
    dist: "140 km",
    duration: "2h 10m",
    vehicle: "REEFER-04 (Scania R450)",
    driver: "Bobur Turgunov",
    cargo: "Perishables (-18°C setpoint verified)",
    status: "Approaching checkpoint",
    progress: 88,
    statusColor: "bg-success",
  },
  {
    id: "DSP-8803",
    lane: "Fergana Valley → Tashkent Central Hub",
    dist: "320 km",
    duration: "5h 40m",
    vehicle: "TRK-09 (Mercedes Actros)",
    driver: "Davron Karimov",
    cargo: "Consumer Goods (Kamchik pass transit)",
    status: "Slow traffic (+35m delay)",
    progress: 42,
    statusColor: "bg-warning",
  },
  {
    id: "DSP-8804",
    lane: "Almaty Yard → Shymkent Corridor",
    dist: "680 km",
    duration: "9h 15m",
    vehicle: "FLAT-02 (Heavy Hauler)",
    driver: "Sardor Yusupov",
    cargo: "Steel Pipes & Industrial Girders",
    status: "Depot loading in progress",
    progress: 12,
    statusColor: "bg-royal",
  },
];

const AVAILABLE_DRIVERS = [
  { name: "Otabek Qodirov", vehicle: "TANK-03", location: "Tashkent Hub", status: "Ready for trip" },
  { name: "Jasur Mirzayev", vehicle: "TRK-14", location: "Samarkand Yard", status: "Ready for trip" },
  { name: "Timur Alimov", vehicle: "VAN-08", location: "Bukhara Depot", status: "Rest period (available in 2h)" },
];

export default function DispatchPage() {
  const [lanes, setLanes] = useState<DispatchLane[]>(INITIAL_DISPATCH_LANES);
  const [appliedSuggested, setAppliedSuggested] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // Assignment Modal Form State
  const [selectedDriverName, setSelectedDriverName] = useState(AVAILABLE_DRIVERS[0].name);
  const [selectedLane, setSelectedLane] = useState("Tashkent Hub → Andijan Depot (340 km)");
  const [cargoDesc, setCargoDesc] = useState("Industrial Spare Parts");

  const handleConfirmAssignment = () => {
    const dr = AVAILABLE_DRIVERS.find((d) => d.name === selectedDriverName) || AVAILABLE_DRIVERS[0];
    const newLane: DispatchLane = {
      id: `DSP-${Math.floor(8805 + lanes.length)}`,
      lane: selectedLane,
      dist: "340 km",
      duration: "5h 15m",
      vehicle: dr.vehicle,
      driver: dr.name,
      cargo: cargoDesc,
      status: "Dispatched from terminal",
      progress: 5,
      statusColor: "bg-blue-500",
    };
    setLanes((prev) => [newLane, ...prev]);
    setAssignOpen(false);
  };

  return (
    <AppShell title="Dispatch & Route Planning" subtitle="Coordinate active highway corridors, live telematics and driver schedules">
      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Active Dispatches</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">48 Dispatches</div>
          <div className="text-xs text-midnight mt-1 font-semibold">44 On-Time · 4 Delayed</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Available Vehicles</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">84 Units</div>
          <div className="text-xs text-[#3F5C96] mt-1">Ready for assignment</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Corridor Efficiency</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">94.8%</div>
          <div className="text-xs text-midnight mt-1 font-semibold">+1.8% vs last month</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Average Fuel Rate</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">28.9 L</div>
          <div className="text-xs text-midnight mt-1 font-semibold">Within green quota</div>
        </div>
      </div>

      {/* Main Grid: Active Lanes + Driver Assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Dispatches Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-light text-base text-[#061336]">Active Highway Corridors</h3>
            <span className="text-xs font-mono text-[#3F5C96]">Auto-synced via ELD Telematics</span>
          </div>

          {lanes.map((d) => (
            <div
              key={d.id}
              className="p-5 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#CFDBEE]/60">
                <div>
                  <span className="text-[10px] font-mono font-semibold text-[#0E2F76] bg-[#dbe9f5] px-2 py-0.5 rounded-full mr-2">
                    {d.id}
                  </span>
                  <span className="font-semibold text-sm text-[#061336]">{d.lane}</span>
                </div>
                <div className="text-xs font-mono text-[#3F5C96]">
                  {d.dist} · ~{d.duration}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#3F5C96] block">Vehicle & Unit</span>
                  <span className="font-semibold text-[#061336]">{d.vehicle}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#3F5C96] block">Assigned Driver</span>
                  <span className="font-semibold text-[#061336]">{d.driver}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#3F5C96] block">Cargo Manifest</span>
                  <span className="font-medium text-[#3F5C96] truncate block">{d.cargo}</span>
                </div>
              </div>

              {/* Route Progress Bar */}
              <div className="pt-2">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-[#061336] flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${d.statusColor}`} />
                    {d.status}
                  </span>
                  <span className="font-mono text-[#3F5C96]">{d.progress}% Completed</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#dbe9f5] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${d.statusColor}`}
                    style={{ width: `${d.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Available Drivers & Assignment */}
        <div className="space-y-6">
          <div className="p-5 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
            <h3 className="font-light text-base text-[#061336] mb-3">Driver Pool Availability</h3>
            <div className="space-y-3">
              {AVAILABLE_DRIVERS.map((dr) => (
                <div key={dr.name} className="p-3 rounded-input bg-[#ffffff] border border-[#CFDBEE]/70 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[#061336]">{dr.name}</div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-success/15 text-midnight border border-success/40">
                      {dr.vehicle}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#3F5C96] mt-1">{dr.location}</div>
                  <div className="text-[10px] text-[#0E2F76] font-medium mt-1">{dr.status}</div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="w-full mt-4 py-2 px-3 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-[#FFFFFF] text-xs font-medium transition-colors"
            >
              Assign New Route
            </button>
          </div>

          <div className="p-5 rounded-card bg-[#0E2F76] text-[#FFFFFF]">
            <div className="text-xs font-mono text-[#A9C0E0] uppercase tracking-wider mb-2">
              AI Route Optimization
            </div>
            <h4 className="text-sm font-semibold leading-snug">
              {appliedSuggested
                ? "Corridor optimization active: Samarkand → Bukhara route redirected via bypass."
                : "Alternate corridor recommended for Samarkand → Bukhara: saves 42 km & avoids toll bottlenecks."}
            </h4>
            <button
              type="button"
              onClick={() => setAppliedSuggested((v) => !v)}
              className="mt-4 px-3 py-1.5 rounded-full bg-[#FFFFFF] text-[#0E2F76] text-xs font-medium hover:bg-[#F4FEFF] flex items-center gap-1.5 transition-colors"
            >
              {appliedSuggested ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" /> Applied to Active Dispatches
                </>
              ) : (
                "Apply Suggested Route"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Assign Route Modal */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 bg-[#061336]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-card border border-[#CFDBEE] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#0E2F76]" />
                <h3 className="font-light text-base text-[#061336]">Assign Route & Vehicle</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                className="p-1 rounded-full text-[#3F5C96] hover:bg-[#dbe9f5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Available Driver & Truck</label>
                <select
                  value={selectedDriverName}
                  onChange={(e) => setSelectedDriverName(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] focus:outline-none"
                >
                  {AVAILABLE_DRIVERS.map((dr) => (
                    <option key={dr.name} value={dr.name}>
                      {dr.name} ({dr.vehicle}) — {dr.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#061336] mb-1">Target Corridor Lane</label>
                <select
                  value={selectedLane}
                  onChange={(e) => setSelectedLane(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] focus:outline-none"
                >
                  <option value="Tashkent Hub → Andijan Depot (340 km)">
                    Tashkent Hub → Andijan Depot (340 km via Kamchik)
                  </option>
                  <option value="Navoi Free Zone → Bukhara (140 km)">
                    Navoi Free Zone → Bukhara (140 km)
                  </option>
                  <option value="Tashkent → Termez Southern Hub (680 km)">
                    Tashkent → Termez Southern Hub (680 km)
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#061336] mb-1">Cargo Manifest Summary</label>
                <input
                  type="text"
                  value={cargoDesc}
                  onChange={(e) => setCargoDesc(e.target.value)}
                  placeholder="e.g. Industrial Spare Parts"
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#CFDBEE]">
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                className="px-4 py-2 rounded-full border border-[#CFDBEE] text-xs font-medium text-[#3F5C96]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                className="px-4 py-2 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium hover:bg-[#061336]"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

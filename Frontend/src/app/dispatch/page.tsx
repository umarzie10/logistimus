"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Route as RouteIcon, Plus, X, Compass, Activity } from "lucide-react";

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
}

export default function DispatchPage() {
  const [lanes, setLanes] = useState<DispatchLane[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);

  // Form State
  const [driverName, setDriverName] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [laneName, setLaneName] = useState("");
  const [cargoDesc, setCargoDesc] = useState("");

  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !laneName) return;

    const newLane: DispatchLane = {
      id: `DSP-${Math.floor(8800 + Math.random() * 900)}`,
      lane: laneName.trim(),
      dist: "340 km",
      duration: "5h 15m",
      vehicle: vehicleName.trim() || "TRK-01",
      driver: driverName.trim(),
      cargo: cargoDesc.trim() || "General Consignment",
      status: "Dispatched from terminal",
      progress: 5,
    };
    setLanes((prev) => [newLane, ...prev]);
    setDriverName("");
    setVehicleName("");
    setLaneName("");
    setCargoDesc("");
    setAssignOpen(false);
  };

  return (
    <AppShell title="Dispatch & Route Planning" subtitle="Coordinate active highway corridors, live telematics and driver schedules">
      {/* Top Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Active Dispatches</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">{lanes.length} Dispatches</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Workspace Trips</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">On-Road Transit</div>
          <div className="text-2xl font-light tabular-nums text-[#0E2F76] mt-1">
            {lanes.filter((l) => l.progress > 0 && l.progress < 100).length} Units
          </div>
          <div className="text-xs text-[#3F5C96] mt-0.5">En Route</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Corridor Engine</div>
          <div className="text-2xl font-light tabular-nums text-blue-600 mt-1">Scheduled</div>
          <div className="text-xs text-blue-700 mt-0.5 font-medium">Phase 4 Optimizer</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">WebSocket Stream</div>
          <div className="text-2xl font-light tabular-nums text-royal mt-1">Ready</div>
          <div className="text-xs text-muted mt-0.5 font-medium">/ws/ping/ Active</div>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <button
          type="button"
          onClick={() => setAssignOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-xs font-medium text-[#FFFFFF]"
        >
          <Plus className="w-4 h-4" /> Plan Dispatch Corridor
        </button>
      </div>

      {lanes.length === 0 ? (
        <div className="bg-[#FFFFFF] rounded-card border border-[#CFDBEE] p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F4FEFF] border border-[#CFDBEE] text-[#0E2F76] flex items-center justify-center mx-auto">
            <RouteIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-light text-[#061336]">No Active Dispatches in Workspace</h2>
          <p className="text-xs text-[#3F5C96] max-w-md mx-auto leading-relaxed">
            Dispatch corridors, driver assignments, and live progress bars will populate when shipments are assigned. The automated dispatch optimizer is scheduled for backend Phase 4.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336]"
            >
              <Plus className="w-3.5 h-3.5" /> Plan First Corridor
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {lanes.map((lane) => (
            <div key={lane.id} className="p-5 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#CFDBEE]/60 pb-3">
                <div>
                  <span className="font-mono font-semibold text-xs text-[#0E2F76] bg-[#dbe9f5] px-2 py-0.5 rounded-full mr-2">
                    {lane.id}
                  </span>
                  <span className="font-semibold text-xs text-[#061336]">{lane.lane}</span>
                </div>
                <div className="text-xs text-[#3F5C96] font-mono">
                  {lane.dist} · Approx {lane.duration}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[#3F5C96]">Vehicle:</span>
                  <div className="font-semibold text-[#061336]">{lane.vehicle}</div>
                </div>
                <div>
                  <span className="text-[#3F5C96]">Driver:</span>
                  <div className="font-semibold text-[#061336]">{lane.driver}</div>
                </div>
                <div>
                  <span className="text-[#3F5C96]">Cargo:</span>
                  <div className="font-semibold text-[#061336] truncate">{lane.cargo}</div>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-[#3F5C96]">
                  <span>{lane.status}</span>
                  <span className="font-mono font-semibold">{lane.progress}%</span>
                </div>
                <div className="w-full bg-[#F4FEFF] h-2 rounded-full overflow-hidden border border-[#CFDBEE]">
                  <div
                    className="bg-[#0E2F76] h-full transition-all duration-300"
                    style={{ width: `${lane.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Dispatch Modal */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 bg-[#061336]/65 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-card border border-[#CFDBEE] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
              <h2 className="font-light text-base text-[#061336]">Plan Dispatch Corridor</h2>
              <button type="button" onClick={() => setAssignOpen(false)} className="text-[#3F5C96]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmAssignment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Highway Corridor / Route</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tashkent Hub → Samarkand Terminal (M-39)"
                  value={laneName}
                  onChange={(e) => setLaneName(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Driver Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Assigned Driver"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Vehicle ID</label>
                  <input
                    type="text"
                    placeholder="TRK-01"
                    value={vehicleName}
                    onChange={(e) => setVehicleName(e.target.value)}
                    className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Cargo Consignment</label>
                <input
                  type="text"
                  placeholder="Freight description and weight"
                  value={cargoDesc}
                  onChange={(e) => setCargoDesc(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#CFDBEE]">
                <button type="button" onClick={() => setAssignOpen(false)} className="px-3 py-1.5 rounded-full border border-[#CFDBEE] text-[#3F5C96]">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0E2F76] text-white font-medium hover:bg-[#061336]">
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

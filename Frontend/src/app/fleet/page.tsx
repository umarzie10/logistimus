"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import Image from "next/image";
import { Activity, X, Gauge, ShieldCheck, Thermometer, Truck, Plus } from "lucide-react";

interface Vehicle {
  id: string;
  model: string;
  plate: string;
  type: string;
  status: string;
  driver: string;
  odometer: string;
  fuel: string;
  maintenance: string;
  image: string;
}

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [inspectVehicle, setInspectVehicle] = useState<Vehicle | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New vehicle form state
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("Heavy Tractor");

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !plate) return;

    const newV: Vehicle = {
      id: `TRK-${Math.floor(10 + Math.random() * 90)}`,
      model: model.trim(),
      plate: plate.trim(),
      type: type,
      status: "Available at Yard",
      driver: "Unassigned",
      odometer: "0 km",
      fuel: "100%",
      maintenance: "Inspection pending initial trip",
      image: "/assets/3d/vehicles/truck-container-blue.webp",
    };

    setVehicles((prev) => [newV, ...prev]);
    setModel("");
    setPlate("");
    setShowAddModal(false);
  };

  return (
    <AppShell title="Fleet Operations & Telematics" subtitle="Monitor vehicle health, fuel efficiency, and IoT sensors">
      {/* Top Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Enrolled Fleet</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">{vehicles.length} Units</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Workspace Assets</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">In Transit</div>
          <div className="text-2xl font-light tabular-nums text-[#0E2F76] mt-1">
            {vehicles.filter((v) => v.status === "In Transit").length} Units
          </div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Active Road Corridors</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Available at Depot</div>
          <div className="text-2xl font-light tabular-nums text-emerald-600 mt-1">
            {vehicles.filter((v) => v.status.includes("Available") || v.status.includes("Yard")).length} Units
          </div>
          <div className="text-xs text-emerald-700 mt-0.5 font-medium">Ready for Dispatch</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Telematics Link</div>
          <div className="text-2xl font-light tabular-nums text-blue-600 mt-1">Active</div>
          <div className="text-xs text-blue-700 mt-0.5 font-medium">GPS Engine Ready</div>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-xs font-medium text-[#FFFFFF]"
        >
          <Plus className="w-4 h-4" /> Enroll New Vehicle
        </button>
      </div>

      {/* Fleet Cards or Empty State */}
      {vehicles.length === 0 ? (
        <div className="bg-[#FFFFFF] rounded-card border border-[#CFDBEE] p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F4FEFF] border border-[#CFDBEE] text-[#0E2F76] flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-light text-[#061336]">No Vehicles Enrolled in Workspace</h2>
          <p className="text-xs text-[#3F5C96] max-w-md mx-auto leading-relaxed">
            Your organization fleet registry is empty. Register trucks, tractor units, or delivery vans to monitor fuel economy, IoT telematics, and maintenance logs. Fleet models are scheduled for backend Phase 5.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336]"
            >
              <Plus className="w-3.5 h-3.5" /> Enroll First Vehicle
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="p-5 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] flex flex-col justify-between hover:border-[#0E2F76] transition-all"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]/60">
                  <div>
                    <span className="font-mono font-semibold text-xs text-[#0E2F76] bg-[#dbe9f5] px-2 py-0.5 rounded-full">
                      {v.id}
                    </span>
                    <span className="text-xs font-mono text-[#3F5C96] ml-2 font-semibold">{v.plate}</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success/15 text-midnight border border-success/40">
                    {v.status}
                  </span>
                </div>

                <div className="relative my-4 h-36 w-full flex items-center justify-center bg-white rounded-input overflow-hidden p-2">
                  <Image
                    src={v.image}
                    alt={v.model}
                    fill
                    className="object-contain"
                    loading="eager"
                  />
                </div>

                <h3 className="font-light text-base text-[#061336] leading-snug">
                  {v.model}
                </h3>
                <p className="text-xs text-[#3F5C96] mt-0.5">{v.type}</p>

                <div className="mt-4 p-3 rounded-input bg-[#ffffff] border border-[#CFDBEE]/70 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#3F5C96]">Assigned Driver:</span>
                    <span className="font-semibold text-[#061336]">{v.driver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3F5C96]">Odometer:</span>
                    <span className="font-mono text-[#061336]">{v.odometer}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#3F5C96]">Fuel Level:</span>
                    <span className="font-mono font-semibold text-midnight">{v.fuel}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#CFDBEE]/60 mt-4 flex items-center justify-between text-[11px] text-[#3F5C96]">
                <span className="truncate">{v.maintenance}</span>
                <button
                  type="button"
                  onClick={() => setInspectVehicle(v)}
                  className="text-xs font-medium text-[#0E2F76] hover:underline"
                >
                  Inspect Telematics →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enroll Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#061336]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-card border border-[#CFDBEE] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
              <h2 className="font-light text-base text-[#061336]">Enroll New Vehicle</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[#3F5C96]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddVehicle} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Make & Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Volvo FH540 6x4 Tractor"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#061336] mb-1">License Plate</label>
                <input
                  type="text"
                  required
                  placeholder="01 789 AAA"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Vehicle Classification</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                >
                  <option value="Heavy Semi-Truck">Heavy Semi-Truck</option>
                  <option value="Refrigerated Carrier">Refrigerated Carrier</option>
                  <option value="Liquid Tanker">Liquid Tanker</option>
                  <option value="Urban Delivery Van">Urban Delivery Van</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#CFDBEE]">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 rounded-full border border-[#CFDBEE] text-[#3F5C96]">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0E2F76] text-white font-medium hover:bg-[#061336]">
                  Enroll Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Telematics Drawer */}
      {inspectVehicle && (
        <div className="fixed inset-0 z-50 bg-[#061336]/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-[#FFFFFF] h-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#CFDBEE]">
                <div>
                  <span className="text-xs font-mono text-[#3F5C96]">Telematics Diagnostic Link</span>
                  <h2 className="text-xl font-light text-[#061336]">{inspectVehicle.model}</h2>
                  <div className="text-xs font-mono text-[#0E2F76]">{inspectVehicle.plate}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectVehicle(null)}
                  className="p-2 rounded-full text-[#3F5C96] hover:bg-[#ffffff]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 space-y-4 text-xs">
                <div className="p-4 rounded-input bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Sensor Status: Certified Operational
                  </div>
                  <div className="text-[11px] text-emerald-700">CAN-bus diagnostics active. Encrypted telemetry.</div>
                </div>

                <div className="p-4 rounded-input bg-[#ffffff] border border-[#CFDBEE] space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#3F5C96]">Assigned Driver:</span>
                    <span className="font-semibold text-[#061336]">{inspectVehicle.driver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3F5C96]">Odometer Reading:</span>
                    <span className="font-mono text-[#061336]">{inspectVehicle.odometer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3F5C96]">Fuel Tank Level:</span>
                    <span className="font-mono text-[#061336]">{inspectVehicle.fuel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3F5C96]">Next Maintenance Interval:</span>
                    <span className="text-[#061336] font-medium">{inspectVehicle.maintenance}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#CFDBEE] flex justify-end">
              <button
                type="button"
                onClick={() => setInspectVehicle(null)}
                className="px-4 py-2 rounded-full bg-[#0E2F76] text-white text-xs font-medium"
              >
                Close Diagnostic View
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

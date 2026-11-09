"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Phone, Clock, X, ShieldCheck, UserCheck, Plus } from "lucide-react";

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

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Driver Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("Cat CE · Long Haul");
  const [experience, setExperience] = useState("5 years");

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const newDriver: Driver = {
      name: name.trim(),
      id: `DRV-${Math.floor(100 + Math.random() * 900)}`,
      experience: experience,
      license: license,
      assigned: "Unassigned",
      onTimeRate: "100%",
      safetyScore: "100/100",
      phone: phone.trim(),
      status: "Available at Yard",
      statusClass: "bg-success/15 text-midnight border-success/40",
    };

    setDrivers((prev) => [newDriver, ...prev]);
    setName("");
    setPhone("");
    setShowAddModal(false);
  };

  return (
    <AppShell title="Driver Roster & Duty Compliance" subtitle="Driver personnel, hours of service, safety scores and trip history">
      {/* Top Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Active Drivers</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">{drivers.length} Drivers</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Workspace Personnel</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">On Active Duty</div>
          <div className="text-2xl font-light tabular-nums text-[#0E2F76] mt-1">
            {drivers.filter((d) => d.status.includes("Active")).length} Drivers
          </div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Dispatched</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Safety Compliance</div>
          <div className="text-2xl font-light tabular-nums text-emerald-600 mt-1">100%</div>
          <div className="text-xs text-emerald-700 mt-0.5 font-medium">Verified Valid</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Duty Logbook</div>
          <div className="text-2xl font-light tabular-nums text-blue-600 mt-1">Scheduled</div>
          <div className="text-xs text-blue-700 mt-0.5 font-medium">Phase 5 HOS Module</div>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-xs font-medium text-[#FFFFFF]"
        >
          <Plus className="w-4 h-4" /> Enroll Driver
        </button>
      </div>

      {drivers.length === 0 ? (
        <div className="bg-[#FFFFFF] rounded-card border border-[#CFDBEE] p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F4FEFF] border border-[#CFDBEE] text-[#0E2F76] flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-light text-[#061336]">No Drivers Enrolled in Workspace</h2>
          <p className="text-xs text-[#3F5C96] max-w-md mx-auto leading-relaxed">
            Your organization driver roster is empty. Register drivers to manage licensing, digital tachograph logs, safety records, and dispatch allocations. Driver models are scheduled for backend Phase 5.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336]"
            >
              <Plus className="w-3.5 h-3.5" /> Enroll First Driver
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {drivers.map((d) => (
            <div
              key={d.id}
              className="p-5 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-3"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]/60">
                <div>
                  <h3 className="font-semibold text-sm text-[#061336]">{d.name}</h3>
                  <div className="text-xs font-mono text-[#3F5C96]">{d.id} · {d.experience}</div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {d.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#3F5C96]">License Classification:</span>
                  <div className="font-semibold text-[#061336]">{d.license}</div>
                </div>
                <div>
                  <span className="text-[#3F5C96]">Assigned Vehicle:</span>
                  <div className="font-semibold text-[#061336]">{d.assigned}</div>
                </div>
                <div>
                  <span className="text-[#3F5C96]">Phone Contact:</span>
                  <div className="font-mono text-[#061336]">{d.phone}</div>
                </div>
                <div>
                  <span className="text-[#3F5C96]">Safety Rating:</span>
                  <div className="font-mono font-semibold text-emerald-700">{d.safetyScore}</div>
                </div>
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
              <h2 className="font-light text-base text-[#061336]">Enroll New Driver</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[#3F5C96]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddDriver} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jasur Mirzayev"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+998 90 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Commercial License</label>
                <input
                  type="text"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#CFDBEE]">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 rounded-full border border-[#CFDBEE] text-[#3F5C96]">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0E2F76] text-white font-medium hover:bg-[#061336]">
                  Enroll Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

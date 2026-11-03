"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import Image from "next/image";
import { Activity, X, Gauge, ShieldCheck, Thermometer } from "lucide-react";

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

const VEHICLES: Vehicle[] = [
  {
    id: "TRK-01",
    model: "Volvo FH540 6x4 Tractor",
    plate: "01 789 AAA",
    type: "Heavy Semi-Truck",
    status: "In Transit",
    driver: "Akmal Saidov",
    odometer: "284,500 km",
    fuel: "82% (Full Tank)",
    maintenance: "Next service in 14,000 km",
    image: "/assets/3d/vehicles/truck-container-blue.webp",
  },
  {
    id: "REEFER-04",
    model: "Scania R450 ThermoKing Dual",
    plate: "01 456 BBB",
    type: "Refrigerated Carrier",
    status: "Loading at Dock 2",
    driver: "Bobur Turgunov",
    odometer: "192,100 km",
    fuel: "68%",
    maintenance: "Reefer calibration valid (90d)",
    image: "/assets/3d/vehicles/truck-reefer-white.webp",
  },
  {
    id: "TANK-03",
    model: "Mercedes-Benz Actros 3345",
    plate: "01 234 CCC",
    type: "Liquid Fuel Tanker",
    status: "Available at Yard",
    driver: "Otabek Qodirov",
    odometer: "312,800 km",
    fuel: "95%",
    maintenance: "ADR certification valid",
    image: "/assets/3d/vehicles/truck-tanker.webp",
  },
  {
    id: "VAN-08",
    model: "Iveco Daily 35S18 Last-Mile",
    plate: "01 999 DDD",
    type: "Urban Delivery Van",
    status: "In Transit",
    driver: "Jasur Mirzayev",
    odometer: "84,300 km",
    fuel: "54%",
    maintenance: "Brake pads inspection completed",
    image: "/assets/3d/vehicles/van-white.webp",
  },
  {
    id: "CAR-01",
    model: "MAN TGX Car Carrier Transporter",
    plate: "01 555 EEE",
    type: "Automobile Transport",
    status: "In Transit",
    driver: "Timur Alimov",
    odometer: "245,600 km",
    fuel: "76%",
    maintenance: "Hydraulic ramp inspected",
    image: "/assets/3d/vehicles/truck-car-carrier.webp",
  },
  {
    id: "FLAT-02",
    model: "DAF XF 480 Timber Flatbed",
    plate: "01 777 FFF",
    type: "Heavy Cargo Flatbed",
    status: "Maintenance Check",
    driver: "Sardor Yusupov",
    odometer: "398,000 km",
    fuel: "30%",
    maintenance: "Tire rotation scheduled today",
    image: "/assets/3d/vehicles/truck-flatbed-logs.webp",
  },
];

export default function FleetPage() {
  const [inspectVehicle, setInspectVehicle] = useState<Vehicle | null>(null);

  return (
    <AppShell title="Fleet Management" subtitle="Telematics, vehicle health, maintenance schedules and fuel optimization">
      {/* Top Telematics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Total Fleet</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">362 Units</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Heavy, Medium & Last-Mile</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">In Operation</div>
          <div className="text-2xl font-light tabular-nums text-midnight mt-1">314 Units</div>
          <div className="text-xs text-midnight mt-0.5 font-medium">87% Active Utilization</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Scheduled Service</div>
          <div className="text-2xl font-light tabular-nums text-midnight mt-1">12 Units</div>
          <div className="text-xs text-midnight mt-0.5 font-medium">Under routine maintenance</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">ELD Compliance</div>
          <div className="text-2xl font-light tabular-nums text-blue-600 mt-1">100%</div>
          <div className="text-xs text-blue-700 mt-0.5 font-medium">Certified Telematics</div>
        </div>
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {VEHICLES.map((v) => (
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

              {/* 3D Vehicle Render */}
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

      {/* Telematics Inspection Modal */}
      {inspectVehicle && (
        <div className="fixed inset-0 z-50 bg-[#061336]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-card border border-[#CFDBEE] p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#0E2F76]" />
                <div>
                  <h3 className="font-light text-base text-[#061336]">
                    {inspectVehicle.id} · CAN-Bus Telematics
                  </h3>
                  <span className="text-xs font-mono text-[#3F5C96]">
                    {inspectVehicle.model} ({inspectVehicle.plate})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectVehicle(null)}
                className="p-1 rounded-full text-[#3F5C96] hover:bg-[#dbe9f5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-input bg-[#dbe9f5]">
                <div className="text-[10px] text-[#3F5C96] flex items-center justify-center gap-1">
                  <Gauge className="w-3 h-3" /> Speed Telemetry
                </div>
                <div className="font-mono font-semibold text-sm text-[#0E2F76] mt-0.5">68 km/h</div>
              </div>
              <div className="p-2.5 rounded-input bg-[#dbe9f5]">
                <div className="text-[10px] text-[#3F5C96] flex items-center justify-center gap-1">
                  <Thermometer className="w-3 h-3" /> Oil Temp
                </div>
                <div className="font-mono font-semibold text-sm text-[#061336] mt-0.5">92 °C</div>
              </div>
              <div className="p-2.5 rounded-input bg-success/15 border border-success/40">
                <div className="text-[10px] text-midnight flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Engine Status
                </div>
                <div className="font-mono font-semibold text-sm text-midnight mt-0.5">Optimal</div>
              </div>
            </div>

            <div className="p-3 rounded-input border border-[#CFDBEE] bg-[#ffffff] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#3F5C96]">Active Driver:</span>
                <span className="font-semibold text-[#061336]">{inspectVehicle.driver}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3F5C96]">Total Odometer:</span>
                <span className="font-mono text-[#061336]">{inspectVehicle.odometer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3F5C96]">Fuel / DEF Reserve:</span>
                <span className="font-mono font-semibold text-midnight">{inspectVehicle.fuel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3F5C96]">Next Scheduled Service:</span>
                <span className="text-[#0E2F76]">{inspectVehicle.maintenance}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#CFDBEE]">
              <button
                type="button"
                onClick={() => setInspectVehicle(null)}
                className="px-4 py-2 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium"
              >
                Close Telematics
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

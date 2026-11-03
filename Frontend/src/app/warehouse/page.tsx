"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import Image from "next/image";
import { Barcode, X, CheckCircle2 } from "lucide-react";

interface InventoryItem {
  sku: string;
  desc: string;
  loc: string;
  qty: string;
  status: string;
}

const DOCKS = [
  { id: "Bay 01", status: "Occupied", truck: "TRK-01 (Volvo)", activity: "Unloading Pallets #448-452", time: "14m remaining" },
  { id: "Bay 02", status: "Available", truck: "None", activity: "Ready for inbound dispatch", time: "Idle" },
  { id: "Bay 03", status: "Occupied", truck: "REEFER-04 (Scania)", activity: "Cold-chain pre-cooling", time: "28m remaining" },
  { id: "Bay 04", status: "Available", truck: "None", activity: "Ready for outbound staging", time: "Idle" },
  { id: "Bay 05", status: "Occupied", truck: "TRK-09 (Actros)", activity: "Cross-dock pallet transfer", time: "40m remaining" },
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { sku: "SKU-9921", desc: "Automotive Transmission Assemblies", loc: "Aisle B-04 / Rack 2", qty: "340 Units", status: "Optimal" },
  { sku: "SKU-8840", desc: "Industrial Sealed Ball Bearings", loc: "Aisle A-01 / Rack 4", qty: "1,200 Boxes", status: "Optimal" },
  { sku: "SKU-7712", desc: "Temperature-Sensitive Vaccines (2-8°C)", loc: "Cold Vault C-01", qty: "480 Totes", status: "Low Stock Alert" },
  { sku: "SKU-6639", desc: "Cotton Yarn Spools (Export Grade)", loc: "Bulk Staging D-03", qty: "4,500 kg", status: "Optimal" },
];

export default function WarehousePage() {
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedSku, setScannedSku] = useState("SKU-5520");
  const [scannedDesc, setScannedDesc] = useState("Industrial Hydraulic Pumps");
  const [scannedLoc, setScannedLoc] = useState("Aisle C-02 / Bin 1");
  const [scannedQty, setScannedQty] = useState("120 Units");
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const handleRegisterScan = () => {
    if (!scannedSku.trim() || !scannedDesc.trim()) return;
    const newItem: InventoryItem = {
      sku: scannedSku.trim().toUpperCase(),
      desc: scannedDesc.trim(),
      loc: scannedLoc.trim() || "Receiving Dock",
      qty: scannedQty.trim() || "50 Units",
      status: "Optimal",
    };
    setInventory((prev) => [newItem, ...prev]);
    setLastScanned(newItem.sku);
    setScanOpen(false);
  };

  return (
    <AppShell title="Warehouse & WMS Hub" subtitle="Distribution terminal docks, automated pallet inventory and bin storage tracking">
      {/* Top Banner with 3D Warehouse */}
      <div className="rounded-card bg-[#0E2F76] text-[#FFFFFF] p-6 sm:p-8 mb-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF]/10 border border-[#FFFFFF]/20 text-xs font-mono text-[#A9C0E0] mb-3">
            Central Distribution Terminal 01
          </div>
          <h2 className="text-2xl sm:text-3xl font-light leading-tight">
            Automated Warehouse Management System (WMS)
          </h2>
          <p className="text-xs sm:text-sm text-[#A9C0E0] mt-2 leading-relaxed">
            Live pallet jack assignment, dock scheduling, bin-level scanning and cross-dock synchronization across 24,000 m² of storage.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs font-mono">
            <span>Storage Capacity: <strong>88% Full</strong></span>
            <span>Active Docks: <strong>3 / 5 In Use</strong></span>
          </div>
        </div>

        <div className="relative w-64 h-44 flex-shrink-0">
          <Image
            src="/assets/3d/warehouses/warehouse-exterior.webp"
            alt="Logistimus Distribution Warehouse"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Dock Bays Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-light text-base text-[#061336]">Loading Dock Bay Status</h3>
          <span className="text-xs font-mono text-[#3F5C96]">Gatehouse Automated Sensor Sync</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {DOCKS.map((d) => (
            <div
              key={d.id}
              className={`p-4 rounded-input border flex flex-col justify-between ${
                d.status === "Occupied"
                  ? "bg-[#FFFFFF] border-[#CFDBEE] "
                  : "bg-success/40 border-success/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#061336]">{d.id}</span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      d.status === "Occupied"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-success/15 text-midnight"
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="font-mono text-xs font-semibold text-[#0E2F76] mt-2 truncate">
                  {d.truck}
                </div>
                <div className="text-[11px] text-[#3F5C96] mt-1 line-clamp-2">
                  {d.activity}
                </div>
              </div>
              <div className="text-[10px] font-mono text-[#3F5C96] pt-2 border-t border-[#CFDBEE]/50 mt-3">
                {d.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-card bg-[#FFFFFF] border border-[#CFDBEE] p-5 sm:p-6 ">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-light text-base text-[#061336]">High-Velocity Inventory Manifest</h3>
            {lastScanned && (
              <span className="text-[11px] font-mono text-midnight bg-success/15 border border-success/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Registered {lastScanned}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="text-xs font-medium text-[#0E2F76] hover:underline"
          >
            Scan New Barcode →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#CFDBEE] text-[11px] font-mono uppercase text-[#3F5C96]">
                <th className="pb-2.5">SKU Code</th>
                <th className="pb-2.5">Product Description</th>
                <th className="pb-2.5">Storage Bin Location</th>
                <th className="pb-2.5">Quantity on Hand</th>
                <th className="pb-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFDBEE]/50">
              {inventory.map((item) => (
                <tr key={item.sku} className="hover:bg-[#ffffff]">
                  <td className="py-3 font-mono font-semibold text-[#0E2F76]">{item.sku}</td>
                  <td className="py-3 font-semibold text-[#061336]">{item.desc}</td>
                  <td className="py-3 font-mono text-[#3F5C96]">{item.loc}</td>
                  <td className="py-3 font-mono font-semibold text-[#061336]">{item.qty}</td>
                  <td className="py-3 text-right">
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        item.status === "Optimal"
                          ? "bg-success/15 text-midnight border-success/40"
                          : "bg-danger/15 text-midnight border-danger/40"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 bg-[#061336]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-card border border-[#CFDBEE] p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-[#0E2F76]" />
                <h3 className="font-light text-base text-[#061336]">WMS Barcode Inbound Scanner</h3>
              </div>
              <button
                type="button"
                onClick={() => setScanOpen(false)}
                className="p-1 rounded-full text-[#3F5C96] hover:bg-[#dbe9f5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-input bg-blue-50/50 border border-[#CFDBEE] text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-[#FFFFFF] border border-[#CFDBEE] text-[#0E2F76]">
                <Barcode className="w-8 h-8" />
              </div>
              <p className="text-xs text-[#3F5C96]">
                Optical barcode reader ready. Scan physical GS1-128 pallet label or verify manifest below.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">SKU / Barcode ID</label>
                  <input
                    type="text"
                    value={scannedSku}
                    onChange={(e) => setScannedSku(e.target.value)}
                    className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Pallet Quantity</label>
                  <input
                    type="text"
                    value={scannedQty}
                    onChange={(e) => setScannedQty(e.target.value)}
                    className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#061336] mb-1">Product Description</label>
                <input
                  type="text"
                  value={scannedDesc}
                  onChange={(e) => setScannedDesc(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#061336] mb-1">Designated Bin Location</label>
                <input
                  type="text"
                  value={scannedLoc}
                  onChange={(e) => setScannedLoc(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#CFDBEE]">
              <button
                type="button"
                onClick={() => setScanOpen(false)}
                className="px-4 py-2 rounded-full border border-[#CFDBEE] text-xs font-medium text-[#3F5C96]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegisterScan}
                className="px-4 py-2 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium hover:bg-[#061336]"
              >
                Register Pallet & Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import Image from "next/image";
import { Barcode, X, CheckCircle2, Warehouse, Plus } from "lucide-react";

interface InventoryItem {
  sku: string;
  desc: string;
  loc: string;
  qty: string;
  status: string;
}

export default function WarehousePage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedSku, setScannedSku] = useState("");
  const [scannedDesc, setScannedDesc] = useState("");
  const [scannedLoc, setScannedLoc] = useState("");
  const [scannedQty, setScannedQty] = useState("");

  const handleRegisterScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedSku.trim() || !scannedDesc.trim()) return;
    const newItem: InventoryItem = {
      sku: scannedSku.trim().toUpperCase(),
      desc: scannedDesc.trim(),
      loc: scannedLoc.trim() || "Receiving Dock 01",
      qty: scannedQty.trim() || "50 Units",
      status: "Optimal",
    };
    setInventory((prev) => [newItem, ...prev]);
    setScannedSku("");
    setScannedDesc("");
    setScannedLoc("");
    setScannedQty("");
    setScanOpen(false);
  };

  return (
    <AppShell title="Warehouse & WMS Hub" subtitle="Distribution terminal docks, automated pallet inventory and bin storage tracking">
      {/* Top Banner */}
      <div className="rounded-card bg-[#0E2F76] text-[#FFFFFF] p-6 sm:p-8 mb-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF]/10 border border-[#FFFFFF]/20 text-xs font-mono text-[#A9C0E0] mb-3">
            WMS Subsystem · Scheduled Phase 6
          </div>
          <h2 className="text-2xl font-light tracking-tight mb-2">Automated Bin & Pallet Control</h2>
          <p className="text-xs text-[#A9C0E0] leading-relaxed">
            Multi-zone cross-docking, barcode scanning, and FIFO inventory turnover. Connect local barcode scanners or terminal handhelds.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFFFFF] text-[#061336] text-xs font-medium hover:bg-[#F4FEFF] transition-colors"
            >
              <Barcode className="w-4 h-4 text-[#0E2F76]" /> Inbound Inventory Scan
            </button>
          </div>
        </div>
        <div className="relative w-48 h-36 flex-shrink-0 opacity-80">
          <Image
            src="/assets/3d/buildings/warehouse-exterior.webp"
            alt="Logistics Warehouse"
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* Inventory Table or Empty State */}
      <div className="p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-4">
        <div className="flex items-center justify-between border-b border-[#CFDBEE] pb-3">
          <div>
            <h3 className="font-light text-base text-[#061336]">Current Stock Records</h3>
            <p className="text-xs text-[#3F5C96]">Active pallet locations, bin IDs, and lot numbers</p>
          </div>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336]"
          >
            <Plus className="w-3.5 h-3.5" /> Scan Inbound Stock
          </button>
        </div>

        {inventory.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F4FEFF] border border-[#CFDBEE] text-[#0E2F76] flex items-center justify-center mx-auto">
              <Warehouse className="w-6 h-6" />
            </div>
            <h2 className="text-base font-light text-[#061336]">No Stock Items Registered in Workspace</h2>
            <p className="text-xs text-[#3F5C96] max-w-md mx-auto leading-relaxed">
              No inventory lots or pallet storage locations have been recorded for this tenant yet. Physical stock transfers and dock scheduling models land in backend Phase 6.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336]"
              >
                <Barcode className="w-3.5 h-3.5" /> Scan First Pallet Lot
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#CFDBEE] text-[10px] font-mono uppercase text-[#3F5C96]">
                  <th className="pb-3">SKU Identifier</th>
                  <th className="pb-3">Commodity Description</th>
                  <th className="pb-3">Bin Location</th>
                  <th className="pb-3">On-Hand Quantity</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFDBEE]/50">
                {inventory.map((item) => (
                  <tr key={item.sku} className="hover:bg-[#F4FEFF] transition-colors">
                    <td className="py-3 font-mono font-semibold text-[#0E2F76]">{item.sku}</td>
                    <td className="py-3 text-[#061336] font-medium">{item.desc}</td>
                    <td className="py-3 text-[#3F5C96] font-mono">{item.loc}</td>
                    <td className="py-3 font-mono font-semibold text-[#061336]">{item.qty}</td>
                    <td className="py-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inbound Scan Modal */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 bg-[#061336]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-card border border-[#CFDBEE] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
              <h2 className="font-light text-base text-[#061336]">Inbound Barcode / Pallet Intake</h2>
              <button type="button" onClick={() => setScanOpen(false)} className="text-[#3F5C96]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegisterScan} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#061336] mb-1">SKU Barcode</label>
                <input
                  type="text"
                  required
                  placeholder="SKU-8820"
                  value={scannedSku}
                  onChange={(e) => setScannedSku(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Industrial Hydraulic Valves"
                  value={scannedDesc}
                  onChange={(e) => setScannedDesc(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Storage Bin</label>
                  <input
                    type="text"
                    placeholder="Aisle A-01 / Rack 2"
                    value={scannedLoc}
                    onChange={(e) => setScannedLoc(e.target.value)}
                    className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Quantity</label>
                  <input
                    type="text"
                    placeholder="100 Units"
                    value={scannedQty}
                    onChange={(e) => setScannedQty(e.target.value)}
                    className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#CFDBEE]">
                <button type="button" onClick={() => setScanOpen(false)} className="px-3 py-1.5 rounded-full border border-[#CFDBEE] text-[#3F5C96]">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0E2F76] text-white font-medium hover:bg-[#061336]">
                  Confirm Lot Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

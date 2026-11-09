"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Package, MapPin, Clock, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";

interface TrackedConsignment {
  id: string;
  status: string;
  origin: string;
  destination: string;
  eta: string;
  carrier: string;
  temperature?: string;
  timeline: { step: string; location: string; time: string; completed: boolean }[];
}

export default function CustomerPortalPage() {
  const [trackId, setTrackId] = useState("");
  const [tracked, setTracked] = useState<TrackedConsignment | null>(null);
  const [searched, setSearched] = useState(false);
  const [inputError, setInputError] = useState("");

  const handleTrack = () => {
    const q = trackId.trim();
    if (!q) {
      setInputError("Please enter a tracking number or bill of lading.");
      setTracked(null);
      setSearched(false);
      return;
    }
    setInputError("");
    setSearched(true);

    // In production Phase 4, queries /api/v1/tracking/public/${q}/
    // For now, if user enters a valid format, show consignment structure, else not found
    if (q.toUpperCase().startsWith("ORD-") || q.toUpperCase().startsWith("TAS-") || q.length >= 6) {
      setTracked({
        id: q.toUpperCase(),
        status: "In Transit · Verified Corridor",
        origin: "Tashkent Central Depot",
        destination: "Samarkand Regional Hub",
        eta: "Today, 16:30",
        carrier: "Logistimus Certified Carrier Network",
        temperature: "-18.4°C (Cold-Chain Verified)",
        timeline: [
          { step: "Order Booked", location: "Central Dispatch", time: "08:00 Today", completed: true },
          { step: "Cargo Dispatched", location: "Tashkent Hub Dock 03", time: "09:30 Today", completed: true },
          { step: "Highway Corridor", location: "Passing Jizzakh (M-39)", time: "12:15 Today", completed: true },
          { step: "Final Delivery", location: "Samarkand Terminal", time: "Estimated 16:30", completed: false },
        ],
      });
    } else {
      setTracked(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4FEFF] text-[#061336]">
      {/* Customer Header */}
      <header className="h-16 bg-[#FFFFFF] border-b border-[#CFDBEE] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative w-7 h-7">
            <Image src="/logo-transparent.png" alt="Logistimus" fill className="object-contain" />
          </div>
          <span className="font-semibold text-lg text-[#061336]">Logistimus Client Tracking</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs font-medium text-[#0E2F76] hover:underline">
            Switch to Carrier Ops →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Track Shipment Bar */}
        <div className="p-8 rounded-card bg-[#0E2F76] text-[#FFFFFF]">
          <h1 className="text-2xl sm:text-3xl font-light">Track Your Cargo Consignment</h1>
          <p className="text-xs sm:text-sm text-[#A9C0E0] mt-1">
            Real-time GPS coordinates, temperature telemetry and estimated arrival time
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#3F5C96] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                placeholder="Enter Tracking # (e.g. ORD-24101 or TAS-9820)"
                className="w-full pl-10 pr-3 py-2.5 rounded-input bg-[#FFFFFF] text-sm text-[#061336] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleTrack}
              className="px-5 py-2.5 rounded-full bg-[#8aa3cb] text-[#061336] font-medium text-xs hover:bg-[#a9c0e0] transition-colors"
            >
              Track Shipment
            </button>
          </div>
          {inputError && (
            <div className="mt-3 text-xs text-danger flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{inputError}</span>
            </div>
          )}
        </div>

        {/* Tracking Results */}
        {tracked ? (
          <div className="p-6 sm:p-8 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#CFDBEE] gap-2">
              <div>
                <span className="text-xs font-mono text-[#3F5C96]">Active Shipment ID</span>
                <h3 className="text-xl font-light tabular-nums text-[#0E2F76]">{tracked.id}</h3>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-success text-midnight border border-success w-fit">
                {tracked.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[#3F5C96]">Origin Departure:</span>
                <div className="font-semibold text-[#061336] text-sm">{tracked.origin}</div>
              </div>
              <div>
                <span className="text-[#3F5C96]">Destination:</span>
                <div className="font-semibold text-[#061336] text-sm">{tracked.destination}</div>
              </div>
              <div>
                <span className="text-[#3F5C96]">Estimated Delivery:</span>
                <div className="font-mono font-semibold text-royal text-sm">{tracked.eta}</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="pt-4 border-t border-[#CFDBEE]">
              <div className="text-xs font-semibold text-[#061336] mb-3">Milestone Progress</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                {tracked.timeline.map((t, idx) => (
                  <div
                    key={idx}
                    className={`border-l-2 sm:border-l-0 sm:border-t-2 pl-3 sm:pl-0 sm:pt-2 ${
                      t.completed ? "border-success" : "border-line"
                    }`}
                  >
                    <div className={`font-semibold ${t.completed ? "text-[#061336]" : "text-blue-600"}`}>
                      {t.step}
                    </div>
                    <div className="text-[11px] text-[#3F5C96]">{t.location}</div>
                    <div className="text-[10px] font-mono text-blue-600">{t.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : searched ? (
          <div className="p-12 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F4FEFF] border border-[#CFDBEE] text-[#0E2F76] flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-light text-[#061336]">Consignment Not Found</h3>
            <p className="text-xs text-[#3F5C96] max-w-sm mx-auto">
              No active shipment matches tracking reference &ldquo;{trackId}&rdquo;. Please verify your consignment ID or contact your carrier operations desk.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}

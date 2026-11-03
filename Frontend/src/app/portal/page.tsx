"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";

export default function CustomerPortalPage() {
  const [trackId, setTrackId] = useState("ORD-24101");
  const [trackedId, setTrackedId] = useState<string | null>("ORD-24101");
  const [notFoundId, setNotFoundId] = useState<string | null>(null);
  const [inputError, setInputError] = useState("");

  const handleTrack = () => {
    const q = trackId.trim();
    if (!q) {
      setInputError("Enter a tracking number or bill of lading.");
      setTrackedId(null);
      setNotFoundId(null);
      return;
    }
    setInputError("");
    if (q.toUpperCase() === "ORD-24101") {
      setTrackedId("ORD-24101");
      setNotFoundId(null);
    } else {
      setTrackedId(null);
      setNotFoundId(q);
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
          <span className="font-semibold text-lg text-[#061336]">Logistimus Client Portal</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs font-medium text-[#0E2F76] hover:underline">
            Switch to Carrier Ops →
          </Link>
          <div className="w-8 h-8 rounded-full bg-[#dbe9f5] text-[#0E2F76] font-semibold text-xs flex items-center justify-center">
            NP
          </div>
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
                placeholder="Enter Tracking # or Bill of Lading"
                className="w-full pl-10 pr-3 py-2.5 rounded-input bg-[#FFFFFF] text-sm text-[#061336] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleTrack}
              className="px-5 py-2.5 rounded-full bg-[#8aa3cb] text-[#061336] font-medium text-xs hover:bg-[#a9c0e0]"
            >
              Track Shipment
            </button>
          </div>
          {inputError && (
            <span
              role="alert"
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-danger text-midnight text-xs font-semibold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-midnight" aria-hidden />
              {inputError}
            </span>
          )}
        </div>

        {/* Active Track Result Card */}
        {trackedId && (
          <div className="p-6 sm:p-8 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#CFDBEE] gap-2">
              <div>
                <span className="text-xs font-mono text-[#3F5C96]">Active Shipment ID</span>
                <h3 className="text-xl font-light tabular-nums text-[#0E2F76]">{trackedId}</h3>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                In Transit · On Schedule
              </span>
            </div>

            <div className="py-6">
              {/* Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="border-l-2 sm:border-l-0 sm:border-t-2 border-success pl-3 sm:pl-0 sm:pt-2">
                  <div className="font-semibold text-[#061336]">Order Booked</div>
                  <div className="text-[11px] text-[#3F5C96]">Oct 30, 18:00</div>
                </div>
                <div className="border-l-2 sm:border-l-0 sm:border-t-2 border-success pl-3 sm:pl-0 sm:pt-2">
                  <div className="font-semibold text-[#061336]">Cargo Picked Up</div>
                  <div className="text-[11px] text-[#3F5C96]">Tashkent Depot (06:30)</div>
                </div>
                <div className="border-l-2 sm:border-l-0 sm:border-t-2 border-blue-600 pl-3 sm:pl-0 sm:pt-2">
                  <div className="font-semibold text-blue-600 flex items-center gap-1">
                    On Highway Route <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  </div>
                  <div className="text-[11px] text-[#3F5C96]">Passing Jizzakh (68 km/h)</div>
                </div>
                <div className="border-l-2 sm:border-l-0 sm:border-t-2 border-line pl-3 sm:pl-0 sm:pt-2">
                  <div className="font-semibold text-muted">Final Destination</div>
                  <div className="text-[11px] text-[#3F5C96]">Samarkand Hub · ETA 14:30</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Not Found State */}
        {notFoundId && (
          <div className="p-8 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-[#0E2F76]">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-light text-[#061336]">Shipment Not Found</h3>
            <p className="text-xs text-[#3F5C96] max-w-md mx-auto">
              No cargo consignment matching &ldquo;{notFoundId}&rdquo; was found in this demo system.
              Try querying demo order <button type="button" onClick={() => { setTrackId("ORD-24101"); setTrackedId("ORD-24101"); setNotFoundId(null); }} className="text-[#0E2F76] font-semibold underline">ORD-24101</button>.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

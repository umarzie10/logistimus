"use client";

import { useState } from "react";
import Link from "next/link";
import { Navigation, CheckCircle } from "lucide-react";

export default function DriverPortalPage() {
  const [signed, setSigned] = useState(false);
  const [gpsOn, setGpsOn] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4FEFF] max-w-md mx-auto border-x border-[#CFDBEE] flex flex-col justify-between">
      {/* Driver App Header */}
      <header className="h-16 bg-[#061336] text-[#FFFFFF] px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#0E2F76] text-xs font-semibold flex items-center justify-center">
            AS
          </div>
          <div>
            <div className="font-semibold text-xs">Akmal Saidov</div>
            <div className="text-[10px] text-[#A9C0E0] font-mono">Vehicle TRK-01 (Volvo FH540)</div>
          </div>
        </div>
        <Link href="/dashboard" className="text-[11px] text-[#A9C0E0] hover:text-[#FFFFFF] underline">
          Dispatcher View
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4">
        {/* Active Trip Banner */}
        <div className="p-4 rounded-card bg-[#0E2F76] text-[#FFFFFF] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0a2156] text-[#A9C0E0]">
              ACTIVE TRIP #DSP-8801
            </span>
            <span className="text-xs font-semibold text-success">On Highway</span>
          </div>
          <h2 className="text-base font-light leading-tight">
            Tashkent Hub → Samarkand Terminal
          </h2>
          <div className="text-xs text-[#A9C0E0]">
            310 km total · 142 km remaining · ETA 14:30
          </div>
        </div>

        {/* Next Waypoint Navigation */}
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-[#061336]">
            <Navigation className="w-4 h-4 text-[#0E2F76]" />
            <span>Next Waypoint</span>
          </div>
          <div className="p-3 rounded-input bg-[#ffffff] border border-[#CFDBEE]">
            <div className="font-semibold text-[#061336]">Jizzakh Rest Stop & Refuel #12</div>
            <div className="text-[11px] text-[#3F5C96] mt-0.5">M-39 Highway km 204 · Distance: 18 km</div>
          </div>
          <button
            type="button"
            onClick={() => setGpsOn((v) => !v)}
            aria-pressed={gpsOn}
            className={
              gpsOn
                ? "w-full py-2.5 rounded-full bg-success/15 border border-success text-midnight font-medium text-xs flex items-center justify-center gap-2"
                : "w-full py-2.5 rounded-full bg-[#0E2F76] text-[#FFFFFF] font-medium text-xs flex items-center justify-center gap-2"
            }
          >
            <Navigation className="w-4 h-4" />
            {gpsOn ? "GPS Active — Tap to Stop" : "Start Turn-by-Turn GPS"}
          </button>
          {gpsOn && (
            <p className="text-[11px] text-[#3F5C96] text-center pt-1">
              Demo mode — no live GPS backend connected.
            </p>
          )}
        </div>

        {/* Proof of Delivery Card */}
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-3 text-xs">
          <div className="font-semibold text-[#061336]">Proof of Delivery (POD)</div>
          <p className="text-[#3F5C96]">
            Upon arrival at Samarkand Regional Hub, collect recipient e-signature or upload signed bill of lading.
          </p>

          {signed ? (
            <div className="p-3 rounded-input bg-success/15 border border-success/40 text-midnight font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-midnight" />
              Digital POD Signed and Verified
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSigned(true)}
              className="w-full py-2.5 rounded-full border-2 border-dashed border-[#0E2F76] text-[#0E2F76] font-medium text-xs hover:bg-[#F4FEFF]"
            >
              Collect Digital Signature
            </button>
          )}
        </div>
      </main>

      {/* Driver Footer Bar */}
      <footer className="h-14 bg-[#FFFFFF] border-t border-[#CFDBEE] px-4 flex items-center justify-around text-[10px] text-[#3F5C96] font-medium">
        <span className="text-[#0E2F76] font-semibold">Active Trip</span>
        <span>Inspection Log</span>
        <span>Duty Hours (4h 12m)</span>
        <span>SOS Dispatch</span>
      </footer>
    </div>
  );
}

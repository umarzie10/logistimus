"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation, CheckCircle, ArrowLeft, ShieldCheck, User } from "lucide-react";
import { authApi, UserProfile } from "@/lib/api";

export default function DriverPortalPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [signed, setSigned] = useState(false);
  const [gpsOn, setGpsOn] = useState(false);

  useEffect(() => {
    authApi.session().then((s) => {
      if (s?.user) setUser(s.user);
    }).catch(() => null);
  }, []);

  return (
    <div className="min-h-screen bg-[#F4FEFF] max-w-md mx-auto border-x border-[#CFDBEE] flex flex-col justify-between">
      {/* Driver App Header */}
      <header className="h-16 bg-[#061336] text-[#FFFFFF] px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#0E2F76] text-xs font-semibold flex items-center justify-center border border-[#2a4a8e]">
            {user?.first_name ? user.first_name[0] : "D"}
          </div>
          <div>
            <div className="font-semibold text-xs text-white">
              {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.email || "Driver Partner")}
            </div>
            <div className="text-[10px] text-[#A9C0E0] font-mono">Mobile Driver Terminal</div>
          </div>
        </div>
        <Link href="/dashboard" className="text-[11px] text-[#A9C0E0] hover:text-[#FFFFFF] underline flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Workspace
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4">
        {/* Active Trip Banner */}
        <div className="p-4 rounded-card bg-[#0E2F76] text-[#FFFFFF] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0a2156] text-[#A9C0E0]">
              DRIVER APP · PHASE 5 MODULE
            </span>
            <span className="text-xs font-semibold text-emerald-400">Roster Ready</span>
          </div>
          <h2 className="text-base font-light leading-tight">
            Assigned Highway Corridors
          </h2>
          <div className="text-xs text-[#A9C0E0]">
            Electronic proof-of-delivery (e-POD), tachograph hours, and vehicle pre-trip inspections.
          </div>
        </div>

        {/* Next Waypoint Navigation */}
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-[#061336]">
            <Navigation className="w-4 h-4 text-[#0E2F76]" />
            <span>Telemetry & Geolocation Link</span>
          </div>
          <div className="p-3 rounded-input bg-[#ffffff] border border-[#CFDBEE]">
            <div className="font-semibold text-[#061336]">Active GPS Coordinates</div>
            <div className="text-[11px] text-[#3F5C96] mt-0.5">Encrypted mobile telemetry link to Logistimus Dispatch</div>
          </div>
          <button
            type="button"
            onClick={() => setGpsOn((v) => !v)}
            aria-pressed={gpsOn}
            className={
              gpsOn
                ? "w-full py-2.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-medium text-xs flex items-center justify-center gap-2"
                : "w-full py-2.5 rounded-full bg-[#0E2F76] text-[#FFFFFF] font-medium text-xs flex items-center justify-center gap-2 hover:bg-[#061336]"
            }
          >
            <Navigation className="w-4 h-4" />
            {gpsOn ? "GPS Tracking Active — Tap to Pause" : "Activate Mobile GPS Tracking"}
          </button>
        </div>

        {/* Proof of Delivery Card */}
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-3 text-xs">
          <div className="font-semibold text-[#061336]">Proof of Delivery (e-POD)</div>
          <p className="text-[#3F5C96]">
            Upon arrival at destination depot, collect recipient digital e-signature or capture photograph of physical bill of lading.
          </p>

          {signed ? (
            <div className="p-3 rounded-input bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Digital e-POD Captured & Synchronized
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
        <span className="text-[#0E2F76] font-semibold">Trips</span>
        <span>Inspection Log</span>
        <span>Hours of Service</span>
        <span>SOS Dispatch</span>
      </footer>
    </div>
  );
}

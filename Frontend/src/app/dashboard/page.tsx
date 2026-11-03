"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import Link from "next/link";
import {
  Package,
  Truck,
  Clock,
  TrendingUp,
  MapPin,
  RefreshCw,
  ArrowUpRight,
  AlertTriangle,
  FileCheck,
  Fuel,
} from "lucide-react";

const STATS = [
  {
    label: "Active Orders",
    val: "1,284",
    change: "+12%",
    isUp: true,
    icon: Package,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    label: "In Transit",
    val: "362",
    change: "+8%",
    isUp: true,
    icon: Truck,
    color: "text-royal bg-blue-100 border-line",
  },
  {
    label: "On-Time Rate",
    val: "96.4%",
    change: "+2.1%",
    isUp: true,
    icon: Clock,
    color: "text-midnight bg-success/15 border-success/40",
  },
  {
    label: "Fleet Utilization",
    val: "87%",
    change: "+3.4%",
    isUp: true,
    icon: TrendingUp,
    color: "text-royal bg-blue-100 border-line",
  },
];

const ORDERS = [
  {
    id: "ORD-24101",
    customer: "Northwind Freight",
    route: "Tashkent → Samarkand",
    status: "In transit",
    statusClass: "bg-blue-50 text-blue-700 border-blue-200",
    eta: "14:30 today",
  },
  {
    id: "ORD-24102",
    customer: "Axis Distribution",
    route: "Bukhara → Tashkent",
    status: "Delivered",
    statusClass: "bg-success/15 text-midnight border-success/40",
    eta: "Completed 09:20",
  },
  {
    id: "ORD-24103",
    customer: "Meridian Cargo",
    route: "Almaty → Shymkent",
    status: "Loading",
    statusClass: "bg-warning/15 text-midnight border-warning/40",
    eta: "Departs 11:00",
  },
  {
    id: "ORD-24104",
    customer: "Bluepeak Retail",
    route: "Fergana → Namangan",
    status: "Delayed",
    statusClass: "bg-danger/15 text-midnight border-danger/40",
    eta: "Delay +45m",
  },
];

const FLEET_STATUS = [
  { id: "TRK-01", loc: "Tashkent Ring Road", status: "In transit", color: "bg-blue-100 text-blue-700" },
  { id: "TRK-07", loc: "Distribution Dock 3", status: "Loading", color: "bg-warning/15 text-midnight" },
  { id: "VAN-12", loc: "Central Depot Yard", status: "Idle", color: "bg-blue-100 text-muted" },
  { id: "TRK-03", loc: "Samarkand Regional Hub", status: "Delivered", color: "bg-success/15 text-midnight" },
];

const RECENT_ACTIVITY = [
  {
    id: 1,
    icon: AlertTriangle,
    color: "text-midnight bg-warning/15",
    title: "Order ORD-24104 flagged for delay risk",
    time: "09:42",
    detail: "Heavy congestion near Kamchik Pass (+45 min ETA)",
  },
  {
    id: 2,
    icon: Truck,
    color: "text-blue-500 bg-blue-50",
    title: "Driver Akmal S. assigned to ORD-24101",
    time: "09:37",
    detail: "Vehicle TRK-01 dispatched with reefer sensor active",
  },
  {
    id: 3,
    icon: FileCheck,
    color: "text-midnight bg-success/15",
    title: "Proof of delivery uploaded for ORD-24102",
    time: "09:20",
    detail: "Digital e-signature verified at Axis Tashkent Depot",
  },
  {
    id: 4,
    icon: Fuel,
    color: "text-royal bg-blue-100",
    title: "Fuel report synced · vehicle UZ 1234 AB",
    time: "08:58",
    detail: "Automated telemetry: 28.4 L/100km average (Optimal)",
  },
];

export default function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("Live");

  const handleRefreshMap = () => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastRefreshed("Updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 500);
  };

  return (
    <AppShell title="Operations Dashboard" subtitle="Real-time control plane · Workspace demo-logistimus">
      {/* 1. Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-5 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#3F5C96]">
                  {stat.label}
                </p>
                <div className="text-2xl sm:text-3xl font-light text-[#061336] mt-1 tabular-nums">
                  {stat.val}
                </div>
                <div className="flex items-center gap-1 mt-1.5 text-xs font-semibold text-midnight">
                  <span>{stat.change}</span>
                  <span className="text-[11px] font-normal text-[#3F5C96]">vs last week</span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-input flex items-center justify-center border ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Middle Row: Live Fleet Map + Fleet Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Live Fleet Map Card */}
        <div className="lg:col-span-2 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0E2F76]" />
              <h3 className="font-light text-base text-[#061336]">Live Fleet Map</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success/15 border border-success/40 text-xs font-mono text-midnight">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {lastRefreshed}
              </span>
              <button
                type="button"
                onClick={handleRefreshMap}
                disabled={refreshing}
                aria-label="Refresh live fleet map"
                title="Refresh live map"
                className="p-1 rounded-full text-[#3F5C96] hover:text-[#061336] hover:bg-[#ffffff] transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#0E2F76]" : ""}`} />
              </button>
            </div>
          </div>

          {/* Interactive Route Canvas Visual */}
          <div className="relative w-full h-72 sm:h-80 rounded-input bg-[#DBE9F5] border border-[#CFDBEE] overflow-hidden p-4 flex flex-col justify-between">
            {/* Map Grid Pattern */}
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#0E2F76_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Rendered Route Visual Graphic */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 800 400"
              fill="none"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Secondary roads */}
              <path d="M 80 120 L 720 120" stroke="#CFDBEE" strokeWidth="3" />
              <path d="M 160 60 L 160 340" stroke="#CFDBEE" strokeWidth="3" />
              <path d="M 440 40 L 440 360" stroke="#CFDBEE" strokeWidth="3" />
              <path d="M 620 80 L 620 320" stroke="#CFDBEE" strokeWidth="3" />

              {/* Main Corridors */}
              <path
                d="M 120 280 L 260 280 L 260 170 L 520 170 L 520 240 L 680 240"
                stroke="#0E2F76"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 120 280 L 260 280 L 260 170 L 520 170 L 520 240 L 680 240"
                stroke="#8aa3cb"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="8 8"
                className="animate-pulse"
              />

              {/* Node Tashkent */}
              <circle cx="120" cy="280" r="10" fill="#0E2F76" />
              <circle cx="120" cy="280" r="5" fill="#FFFFFF" />
              <text x="135" y="285" fill="#061336" fontSize="13" fontWeight="700">Tashkent Hub</text>

              {/* Waypoint Samarkand */}
              <circle cx="260" cy="170" r="8" fill="#4c69a0" />
              <circle cx="260" cy="170" r="3" fill="#FFFFFF" />
              <text x="275" y="165" fill="#061336" fontSize="12" fontWeight="600">Samarkand Terminal</text>

              {/* Active Vehicle Moving */}
              <g transform="translate(390, 160)">
                <rect x="-16" y="-12" width="32" height="24" rx="6" fill="#0E2F76" />
                <circle cx="0" cy="0" r="4" fill="#7fa9a6" />
              </g>

              {/* Node Bukhara */}
              <circle cx="520" cy="240" r="8" fill="#c9b58a" />
              <circle cx="520" cy="240" r="3" fill="#FFFFFF" />
              <text x="535" y="245" fill="#061336" fontSize="12" fontWeight="600">Bukhara Depot (Delayed +15m)</text>

              {/* Destination */}
              <circle cx="680" cy="240" r="10" fill="#7fa9a6" />
              <circle cx="680" cy="240" r="4" fill="#FFFFFF" />
              <text x="695" y="245" fill="#061336" fontSize="13" fontWeight="700">Khiva Hub</text>
            </svg>

            {/* Map Legend */}
            <div className="relative z-10 mt-auto flex items-center gap-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-input border border-[#CFDBEE] w-fit text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" /> Moving (284)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning" /> Delayed (14)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" /> Depot (64)
              </span>
            </div>
          </div>
        </div>

        {/* Fleet Status Card */}
        <div className="rounded-card bg-[#FFFFFF] border border-[#CFDBEE] p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-light text-base text-[#061336]">Fleet Status</h3>
              <Link href="/fleet" className="text-xs font-medium text-[#0E2F76] hover:underline">
                View all (362)
              </Link>
            </div>
            <div className="space-y-3">
              {FLEET_STATUS.map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-input bg-[#ffffff] border border-[#CFDBEE]/70 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-input bg-[#dbe9f5] text-[#0E2F76] flex items-center justify-center font-semibold text-xs font-mono">
                      {f.id.split("-")[1]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#061336]">{f.id}</div>
                      <div className="text-xs text-[#3F5C96]">{f.loc}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.color}`}>
                    {f.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#CFDBEE]/60 mt-4 flex items-center justify-between text-xs text-[#3F5C96]">
            <span>Average Speed: <strong>68 km/h</strong></span>
            <span>Fuel Economy: <strong>29.2 L/100km</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Active Orders Table + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Orders Data Table */}
        <div className="lg:col-span-2 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] p-5 sm:p-6 ">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-light text-base text-[#061336]">Active Orders</h3>
            <div className="flex items-center gap-2">
              <Link
                href="/orders"
                className="text-xs font-medium text-[#0E2F76] hover:underline inline-flex items-center gap-1"
              >
                Orders Center <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#CFDBEE] text-[11px] font-mono uppercase text-[#3F5C96]">
                  <th className="pb-2.5">Order ID</th>
                  <th className="pb-2.5">Customer</th>
                  <th className="pb-2.5">Route Corridor</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFDBEE]/50">
                {ORDERS.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#ffffff] transition-colors">
                    <td className="py-3 font-mono font-semibold text-xs text-[#0E2F76]">
                      {ord.id}
                    </td>
                    <td className="py-3 font-medium text-[#061336] text-xs">
                      {ord.customer}
                    </td>
                    <td className="py-3 text-xs text-[#3F5C96]">
                      {ord.route}
                    </td>
                    <td className="py-3">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ord.statusClass}`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-xs text-[#061336]">
                      {ord.eta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Operational Activity Feed */}
        <div className="rounded-card bg-[#FFFFFF] border border-[#CFDBEE] p-5 sm:p-6 ">
          <h3 className="font-light text-base text-[#061336] mb-4">Live Activity</h3>
          <div className="space-y-4">
            {RECENT_ACTIVITY.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-input flex items-center justify-center flex-shrink-0 mt-0.5 ${act.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#061336] truncate">
                        {act.title}
                      </p>
                      <span className="text-[10px] font-mono text-[#3F5C96] ml-2">
                        {act.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#3F5C96] mt-0.5 leading-snug">
                      {act.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import { AppShell } from "@/components/app/AppShell";
import { BarChart3, TrendingUp, Activity, Layers } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <AppShell title="Analytics & Operational Intelligence" subtitle="Predictive metrics, fuel efficiency curves, route speed trends and CO2 telemetry">
      {/* KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Historical Trips</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">0 Trips</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Workspace Data</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">On-Time Performance</div>
          <div className="text-2xl font-light tabular-nums text-[#0E2F76] mt-1">—</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Requires Completed Trips</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Analytics Engine</div>
          <div className="text-2xl font-light tabular-nums text-blue-600 mt-1">Scheduled</div>
          <div className="text-xs text-blue-700 mt-0.5 font-medium">Phase 8 Aggregations</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Tenant Scope</div>
          <div className="text-2xl font-light tabular-nums text-royal mt-1">Isolated</div>
          <div className="text-xs text-muted mt-0.5 font-medium">Postgres RLS Guarded</div>
        </div>
      </div>

      {/* Analytics Empty State */}
      <div className="p-16 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#F4FEFF] border border-[#CFDBEE] text-[#0E2F76] flex items-center justify-center mx-auto">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h2 className="text-base font-light text-[#061336]">No Analytics Data Available Yet</h2>
        <p className="text-xs text-[#3F5C96] max-w-md mx-auto leading-relaxed">
          Operational velocity curves, corridor turnarounds, driver safety scores, and fuel economy telemetry will automatically calculate here as orders and telemetry pings accumulate in this workspace. Analytical rollups land in backend Phase 8.
        </p>
      </div>
    </AppShell>
  );
}

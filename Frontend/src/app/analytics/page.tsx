"use client";

import { AppShell } from "@/components/app/AppShell";
import { Download } from "lucide-react";
import { downloadTextFile } from "@/lib/download";

export default function AnalyticsPage() {
  const handleDownloadAudit = () => {
    const report = [
      "===========================================================",
      "LOGISTIMUS OPERATIONAL INTELLIGENCE & AUDIT REPORT",
      "Horizon: Last 30 Days (Oct 01 - Oct 31, 2026)",
      "Generated: Client-Side Export",
      "===========================================================",
      "",
      "1. ON-TIME SLA PERFORMANCE",
      "   - Target SLA: 95.0%",
      "   - Fleet Actual: 96.4% (+1.4% ahead of SLA)",
      "   - Total Completed Shipments: 4,120",
      "   - Average Delivery Delay: 14.2 minutes",
      "   - Weekly Breakdown: W1: 94.0% | W2: 95.2% | W3: 96.1% | W4: 96.8% | W5: 97.4%",
      "",
      "2. FLEET FUEL & CARBON EFFICIENCY",
      "   - Overall Fleet Avg: 28.4 L/100km",
      "   - Eco-Score: 94/100 (Low Emissions)",
      "   - Heavy Long-Haul Tractor: 29.8 L/100km (74% capacity)",
      "   - Refrigerated Cold Chain: 32.1 L/100km (82% capacity)",
      "   - Urban Delivery Last-Mile: 11.4 L/100km (38% capacity)",
      "   - CO2 Avoided via Route Optimization: 14.2 Metric Tons",
      "",
      "3. AUDIT CONCLUSION & STATUS",
      "   - Network Reliability: VERIFIED",
      "   - Carrier SLA Status: IN COMPLIANCE",
      "===========================================================",
    ].join("\r\n");

    downloadTextFile("logistimus-audit-report-oct2026.txt", report, "text/plain;charset=utf-8");
  };

  return (
    <AppShell title="Analytics & Operational Intelligence" subtitle="Predictive metrics, fuel efficiency curves, route speed trends and CO2 telemetry">
      {/* Date Filter Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#3F5C96]">Reporting Horizon:</span>
          <span className="font-semibold text-[#061336] bg-[#FFFFFF] px-3 py-1.5 rounded-input border border-[#CFDBEE]">
            Last 30 Days (Oct 01 – Oct 31, 2026)
          </span>
        </div>
        <button
          type="button"
          onClick={handleDownloadAudit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium hover:bg-[#061336] transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download Full PDF Audit
        </button>
      </div>

      {/* Analytics Visual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* On-Time Delivery Metric Bar Chart */}
        <div className="p-5 sm:p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-light text-sm text-[#061336]">On-Time SLA Delivery Performance</h3>
              <p className="text-xs text-[#3F5C96]">Target: 95.0% · Actual Fleet Avg: 96.4%</p>
            </div>
            <span className="font-mono text-midnight font-semibold text-lg">+1.4% Ahead</span>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 border-b border-[#CFDBEE]/60 pb-2">
            {[
              { day: "W1", val: 94, h: "75%" },
              { day: "W2", val: 95.2, h: "82%" },
              { day: "W3", val: 96.1, h: "88%" },
              { day: "W4", val: 96.8, h: "94%" },
              { day: "W5", val: 97.4, h: "98%" },
            ].map((bar) => (
              <div key={bar.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] font-mono text-[#0E2F76] font-semibold">{bar.val}%</span>
                <div
                  className="w-full bg-[#0E2F76] rounded-t-lg transition-all hover:bg-[#0e2f76]"
                  style={{ height: bar.h }}
                />
                <span className="text-[10px] font-mono text-[#3F5C96]">{bar.day}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 flex justify-between text-xs text-[#3F5C96]">
            <span>Average Delivery Delay: <strong>14.2 minutes</strong></span>
            <span>Total Completed Shipments: <strong>4,120</strong></span>
          </div>
        </div>

        {/* Fleet Fuel Consumption Breakdown */}
        <div className="p-5 sm:p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-light text-sm text-[#061336]">Fleet Fuel & Carbon Efficiency</h3>
              <p className="text-xs text-[#3F5C96]">Average: 28.4 L/100km · Eco-Score: 94/100</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-success/15 text-midnight border border-success/40">
              Low Emissions
            </span>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#061336]">Heavy Long-Haul Tractor Trailing</span>
                <span className="font-mono text-[#3F5C96]">29.8 L/100km</span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#dbe9f5] overflow-hidden">
                <div className="h-full bg-[#0E2F76] rounded-full" style={{ width: "74%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#061336]">Refrigerated Cold Chain Fleet</span>
                <span className="font-mono text-[#3F5C96]">32.1 L/100km</span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#dbe9f5] overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "82%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#061336]">Urban Delivery Last-Mile Vans</span>
                <span className="font-mono text-[#3F5C96]">11.4 L/100km</span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#dbe9f5] overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: "38%" }} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#CFDBEE]/60 mt-6 flex justify-between text-xs text-[#3F5C96]">
            <span>CO2 Avoided via Route Optimization: <strong>14.2 Tons</strong></span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

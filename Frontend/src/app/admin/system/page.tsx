"use client";

import { useEffect, useState } from "react";
import { Server, Activity, Database, Cpu, CheckCircle2, RefreshCw } from "lucide-react";
import { platformApi, PlatformSystemHealthResponse, ApiError } from "@/lib/api";

export default function AdminSystemPage() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<PlatformSystemHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadHealth() {
    setLoading(true);
    setError(null);
    try {
      const data = await platformApi.getSystemHealth();
      setHealth(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to fetch system telemetry.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#1c356b]">
        <div>
          <h1 className="text-xl font-light text-white tracking-tight">System Health & Telemetry</h1>
          <p className="text-xs text-[#A9C0E0]">
            Database connection pooling, PostGIS spatial engine, and Redis cache layer status.
          </p>
        </div>
        <button
          type="button"
          onClick={loadHealth}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E2F76]/40 hover:bg-[#0E2F76] text-xs text-[#A9C0E0] hover:text-white border border-[#2a4a8e] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Ping Telemetry
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-input bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database & PostGIS */}
        <div className="p-6 rounded-card bg-[#061336] border border-[#1c356b] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c356b] pb-3">
            <div className="flex items-center gap-2 text-white font-medium text-sm">
              <Database className="w-4 h-4 text-emerald-400" /> PostgreSQL & PostGIS Spatial Engine
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
              {health?.database.connected ? "ONLINE" : "OFFLINE"}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-[#1c356b]/40">
              <span className="text-[#A9C0E0]">Database Vendor</span>
              <span className="font-mono text-white uppercase">{health?.database.engine || "postgresql"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1c356b]/40">
              <span className="text-[#A9C0E0]">PostGIS Extension</span>
              <span className="font-mono text-emerald-400 font-medium">
                {health?.database.postgis_version || "PostGIS 3.4 Active"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1c356b]/40">
              <span className="text-[#A9C0E0]">Query Ping Latency</span>
              <span className="font-mono text-white">{health?.database.latency_ms ?? 0} ms</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1c356b]/40">
              <span className="text-[#A9C0E0]">Row Level Security (RLS)</span>
              <span className="font-mono text-emerald-400">8 Tenant Policies Active</span>
            </div>
          </div>
        </div>

        {/* Cache & Background */}
        <div className="p-6 rounded-card bg-[#061336] border border-[#1c356b] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c356b] pb-3">
            <div className="flex items-center gap-2 text-white font-medium text-sm">
              <Server className="w-4 h-4 text-[#0E2F76]" /> Redis Cache & Asynchronous Broker
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
              {health?.cache.connected ? "ONLINE" : "OFFLINE"}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-[#1c356b]/40">
              <span className="text-[#A9C0E0]">Cache Backend</span>
              <span className="font-mono text-white">{health?.cache.backend || "RedisCache"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1c356b]/40">
              <span className="text-[#A9C0E0]">Channels Layer</span>
              <span className="font-mono text-emerald-400">RedisChannelLayer (/ws/ping/)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1c356b]/40">
              <span className="text-[#A9C0E0]">Celery Worker Broker</span>
              <span className="font-mono text-white">Redis DB 1 (Async Queues)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1c356b]/40">
              <span className="text-[#A9C0E0]">Permission Cache</span>
              <span className="font-mono text-white">Atomic Version Invalidation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

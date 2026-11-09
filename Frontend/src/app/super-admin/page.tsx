"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building,
  Users,
  Server,
  Key,
  Activity,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  platformApi,
  PlatformOverviewResponse,
  PlatformOrgItem,
  ApiError,
} from "@/lib/api";

export default function SuperAdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<PlatformOverviewResponse | null>(null);
  const [recentOrgs, setRecentOrgs] = useState<PlatformOrgItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, orgsData] = await Promise.all([
        platformApi.getOverview(),
        platformApi.getOrganizations(1),
      ]);
      setOverview(overviewData);
      setRecentOrgs(orgsData?.results || []);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to fetch platform telemetry.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center py-20 text-[#A9C0E0] text-xs font-mono">
        <Activity className="w-4 h-4 animate-spin mr-2" /> Loading platform telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1c356b]">
        <div>
          <h1 className="text-xl font-light text-white tracking-tight">Platform Control Plane</h1>
          <p className="text-xs text-[#A9C0E0]">
            System-wide telemetry, multi-tenant state, and global infrastructure health.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E2F76]/40 hover:bg-[#0E2F76] text-xs text-[#A9C0E0] hover:text-white border border-[#2a4a8e] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Telemetry
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-input bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Real Platform KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-card bg-[#061336] border border-[#1c356b] space-y-2">
          <div className="flex items-center justify-between text-[#A9C0E0] text-[10px] font-mono uppercase tracking-wider">
            <span>Total Tenants</span>
            <Building className="w-4 h-4 text-[#0E2F76]" />
          </div>
          <div className="text-3xl font-light tabular-nums text-white">
            {overview?.organizations.total ?? 0}
          </div>
          <div className="text-[11px] text-[#A9C0E0] flex items-center gap-2">
            <span className="text-emerald-400 font-medium">
              {overview?.organizations.active ?? 0} active
            </span>
            <span>·</span>
            <span className="text-amber-400">
              {overview?.organizations.pending ?? 0} pending
            </span>
          </div>
        </div>

        <div className="p-5 rounded-card bg-[#061336] border border-[#1c356b] space-y-2">
          <div className="flex items-center justify-between text-[#A9C0E0] text-[10px] font-mono uppercase tracking-wider">
            <span>Registered Users</span>
            <Users className="w-4 h-4 text-[#0E2F76]" />
          </div>
          <div className="text-3xl font-light tabular-nums text-white">
            {overview?.users.total ?? 0}
          </div>
          <div className="text-[11px] text-[#A9C0E0]">
            <span className="text-emerald-400 font-medium">
              {overview?.users.verified ?? 0} verified identities
            </span>
          </div>
        </div>

        <div className="p-5 rounded-card bg-[#061336] border border-[#1c356b] space-y-2">
          <div className="flex items-center justify-between text-[#A9C0E0] text-[10px] font-mono uppercase tracking-wider">
            <span>Depots & Branches</span>
            <Server className="w-4 h-4 text-[#0E2F76]" />
          </div>
          <div className="text-3xl font-light tabular-nums text-white">
            {overview?.infrastructure.total_branches ?? 0}
          </div>
          <div className="text-[11px] text-[#A9C0E0]">
            <span>{overview?.infrastructure.total_api_keys ?? 0} active API keys</span>
          </div>
        </div>

        <div className="p-5 rounded-card bg-[#061336] border border-[#1c356b] space-y-2">
          <div className="flex items-center justify-between text-[#A9C0E0] text-[10px] font-mono uppercase tracking-wider">
            <span>Database & Engine</span>
            <Activity className="w-4 h-4 text-[#0E2F76]" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            {overview?.system.database_ok ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Healthy
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-red-400">
                <XCircle className="w-4 h-4" /> Degraded
              </span>
            )}
            <span className="text-xs text-[#A9C0E0] font-mono">
              ({overview?.system.environment})
            </span>
          </div>
          <div className="text-[10px] font-mono text-[#A9C0E0]">
            Redis Cache: {overview?.system.redis_ok ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Tenant Organizations Real Table */}
      <div className="p-6 rounded-card bg-[#061336] border border-[#1c356b] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-light text-white">Live Tenant Organizations</h2>
            <p className="text-xs text-[#A9C0E0]">
              Real database tenant records isolated with PostgreSQL Row Level Security.
            </p>
          </div>
          <Link
            href="/super-admin/organizations"
            className="text-xs text-[#A9C0E0] hover:text-white inline-flex items-center gap-1 font-mono"
          >
            Manage All ({overview?.organizations.total ?? 0}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrgs.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#A9C0E0]">
            No tenant organizations registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1c356b] text-[10px] font-mono uppercase text-[#A9C0E0]">
                  <th className="pb-3">Organization Name</th>
                  <th className="pb-3">Slug</th>
                  <th className="pb-3">Currency</th>
                  <th className="pb-3">Members</th>
                  <th className="pb-3">Depots</th>
                  <th className="pb-3">Verification</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c356b]/60">
                {recentOrgs.slice(0, 5).map((org) => (
                  <tr key={org.id} className="hover:bg-[#0E2F76]/20 transition-colors">
                    <td className="py-3 font-medium text-white">{org.name}</td>
                    <td className="py-3 font-mono text-[#A9C0E0]">{org.slug}</td>
                    <td className="py-3 font-mono text-[#A9C0E0]">{org.base_currency}</td>
                    <td className="py-3 font-mono text-[#A9C0E0]">{org.members_count}</td>
                    <td className="py-3 font-mono text-[#A9C0E0]">{org.branches_count}</td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          org.verification_status === "verified"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}
                      >
                        {org.verification_status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          org.is_active
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}
                      >
                        {org.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3 text-[11px] text-[#A9C0E0]">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

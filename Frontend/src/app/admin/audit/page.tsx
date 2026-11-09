"use client";

import { useEffect, useState } from "react";
import { FileText, RefreshCw, Shield } from "lucide-react";
import { platformApi, PlatformAuditLogItem, ApiError } from "@/lib/api";

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<PlatformAuditLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const data = await platformApi.getAuditLogs(1);
      setLogs(data?.results || []);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to fetch system audit logs.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#1c356b]">
        <div>
          <h1 className="text-xl font-light text-white tracking-tight">Global Audit Trail</h1>
          <p className="text-xs text-[#A9C0E0]">
            Immutable, append-only security and operational audit records across all organizations.
          </p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E2F76]/40 hover:bg-[#0E2F76] text-xs text-[#A9C0E0] hover:text-white border border-[#2a4a8e] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-input bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          {error}
        </div>
      )}

      <div className="p-6 rounded-card bg-[#061336] border border-[#1c356b] space-y-4">
        {logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#A9C0E0]">
            No audit logs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1c356b] text-[10px] font-mono uppercase text-[#A9C0E0]">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Actor Email</th>
                  <th className="pb-3">Target Object</th>
                  <th className="pb-3">Organization ID</th>
                  <th className="pb-3">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c356b]/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#0E2F76]/20 transition-colors">
                    <td className="py-3 font-mono text-[10px] text-[#A9C0E0]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 font-mono text-emerald-400 font-medium">
                      {log.action}
                    </td>
                    <td className="py-3 text-white">
                      {log.actor_email || "System"}
                    </td>
                    <td className="py-3 text-[11px] text-[#A9C0E0]">
                      {log.object_type ? `${log.object_type} (${log.object_id.slice(0, 8)}…)` : "—"}
                    </td>
                    <td className="py-3 font-mono text-[10px] text-[#A9C0E0]/80">
                      {log.organization_id ? `${log.organization_id.slice(0, 8)}…` : "Platform Scope"}
                    </td>
                    <td className="py-3 font-mono text-[10px] text-[#A9C0E0]">
                      {log.ip || "127.0.0.1"}
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

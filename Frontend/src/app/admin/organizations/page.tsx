"use client";

import { useEffect, useState } from "react";
import { Building, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { platformApi, PlatformOrgItem, ApiError } from "@/lib/api";

export default function AdminOrganizationsPage() {
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<PlatformOrgItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function loadOrgs(): Promise<void> {
    return platformApi
      .getOrganizations(1)
      .then((data) => {
        setOrgs(data?.results || []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to fetch organizations list.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function toggleStatus(org: PlatformOrgItem) {
    setUpdatingId(org.id);
    try {
      const updated = await platformApi.updateOrganization(org.id, {
        is_active: !org.is_active,
      });
      setOrgs((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, is_active: updated.is_active } : o))
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert(`Failed to update status: ${err.message}`);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function toggleVerification(org: PlatformOrgItem) {
    setUpdatingId(org.id);
    const nextStatus = org.verification_status === "verified" ? "pending" : "verified";
    try {
      const updated = await platformApi.updateOrganization(org.id, {
        verification_status: nextStatus,
      });
      setOrgs((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, verification_status: updated.verification_status } : o))
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert(`Failed to update verification: ${err.message}`);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    loadOrgs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#1c356b]">
        <div>
          <h1 className="text-xl font-light text-white tracking-tight">Tenant Organizations</h1>
          <p className="text-xs text-[#A9C0E0]">
            Manage enterprise company workspaces, verification status, and tenant authorization.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadOrgs();
          }}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E2F76]/40 hover:bg-[#0E2F76] text-xs text-[#A9C0E0] hover:text-white border border-[#2a4a8e] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-input bg-danger/15 border border-danger/40 text-danger text-xs">
          {error}
        </div>
      )}

      <div className="p-6 rounded-card bg-[#061336] border border-[#1c356b] space-y-4">
        {orgs.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#A9C0E0]">
            No tenant organizations found in database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1c356b] text-[10px] font-mono uppercase text-[#A9C0E0]">
                  <th className="pb-3">Organization</th>
                  <th className="pb-3">Slug / UUID</th>
                  <th className="pb-3">Fleet Band</th>
                  <th className="pb-3">Members</th>
                  <th className="pb-3">Branches</th>
                  <th className="pb-3">Verification</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c356b]/60">
                {orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-[#0E2F76]/20 transition-colors">
                    <td className="py-3 font-medium text-white">
                      <div>{org.name}</div>
                      {org.legal_name && (
                        <div className="text-[10px] text-[#A9C0E0]">{org.legal_name}</div>
                      )}
                    </td>
                    <td className="py-3 font-mono text-[10px] text-[#A9C0E0]">
                      <div>{org.slug}</div>
                      <div className="text-[9px] text-[#A9C0E0]/60">{org.id.slice(0, 8)}…</div>
                    </td>
                    <td className="py-3 text-[11px] text-[#A9C0E0]">{org.fleet_size_band || "Standard"}</td>
                    <td className="py-3 font-mono text-[#A9C0E0]">{org.members_count}</td>
                    <td className="py-3 font-mono text-[#A9C0E0]">{org.branches_count}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => toggleVerification(org)}
                        disabled={updatingId === org.id}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                          org.verification_status === "verified"
                            ? "bg-success/15 text-success border border-success/40"
                            : "bg-warning/15 text-warning border border-warning/40"
                        }`}
                      >
                        {org.verification_status}
                      </button>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => toggleStatus(org)}
                        disabled={updatingId === org.id}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                          org.is_active
                            ? "bg-success/15 text-success border border-success/40"
                            : "bg-danger/15 text-danger border border-danger/40"
                        }`}
                      >
                        {org.is_active ? "Active" : "Suspended"}
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleStatus(org)}
                        disabled={updatingId === org.id}
                        className="text-[11px] text-[#A9C0E0] hover:text-white underline font-mono"
                      >
                        {org.is_active ? "Suspend" : "Activate"}
                      </button>
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

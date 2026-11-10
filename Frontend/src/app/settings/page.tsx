"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { ShieldCheck, Plus, RefreshCw, Trash2, Key, MapPin, Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { organizationApi, api, OrgProfile, BranchItem, ApiKeyItem, ApiError } from "@/lib/api";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);

  // Profile Form
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // New Branch Dialog
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPrimary, setBranchPrimary] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);

  // API Key Dialog
  const [showAddKey, setShowAddKey] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  function loadData(): Promise<void> {
    return Promise.all([
      organizationApi.getCurrent(),
      organizationApi.getBranches(),
      organizationApi.getApiKeys(),
    ])
      .then(([currentOrg, branchData, keysData]) => {
        setOrg(currentOrg);
        setName(currentOrg.name || "");
        setCurrency(currentOrg.base_currency || "USD");
        setBranches(branchData.results || []);
        setApiKeys(keysData.results || []);
      })
      .catch(() => {
        // Graceful fallback
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);

    try {
      const updated = await api.patch<OrgProfile>("/organizations/current/", {
        name: name.trim(),
        legal_name: legalName.trim(),
        tax_id: taxId.trim(),
        headquarters_address: address.trim(),
        base_currency: currency,
      });
      setOrg(updated);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setProfileError(err.message);
      } else {
        setProfileError("Failed to update organization profile.");
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCreateBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!branchName.trim()) return;
    setCreatingBranch(true);
    try {
      const created = await api.post<BranchItem>("/organizations/current/branches/", {
        name: branchName.trim(),
        address: branchAddress.trim(),
        is_primary: branchPrimary,
      });
      setBranches((prev) => [created, ...prev]);
      setBranchName("");
      setBranchAddress("");
      setBranchPrimary(false);
      setShowAddBranch(false);
    } catch (err: unknown) {
      alert(err instanceof ApiError ? err.message : "Failed to create branch");
    } finally {
      setCreatingBranch(false);
    }
  }

  async function handleCreateApiKey(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreatingKey(true);
    try {
      const created = await api.post<ApiKeyItem & { secret: string }>("/organizations/current/api-keys/", {
        name: keyName.trim(),
        scopes: ["*"],
      });
      setNewKeySecret(created.secret);
      setApiKeys((prev) => [created, ...prev]);
      setKeyName("");
      setShowAddKey(false);
    } catch (err: unknown) {
      alert(err instanceof ApiError ? err.message : "Failed to issue API key");
    } finally {
      setCreatingKey(false);
    }
  }

  async function handleRevokeKey(id: string) {
    if (!confirm("Are you sure you want to revoke this API key? This action is irreversible.")) return;
    try {
      await api.delete(`/organizations/current/api-keys/${id}/`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err: unknown) {
      alert(err instanceof ApiError ? err.message : "Failed to revoke key");
    }
  }

  return (
    <AppShell
      title="Organization & Infrastructure Settings"
      subtitle="Manage corporate entity identity, regional branch networks, and telematics developer keys"
    >
      <div className="max-w-4xl space-y-6">
        {/* Company Profile Form */}
        <div className="p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#CFDBEE]">
            <div>
              <h2 className="font-light text-base text-[#061336]">Company Identity</h2>
              <p className="text-xs text-[#3F5C96]">Real tenant configuration stored in PostgreSQL</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-success text-midnight border border-success">
              Active Tenant
            </span>
          </div>

          {profileSuccess && (
            <div className="mb-4 p-3 rounded-input bg-success border border-success text-midnight text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-midnight" />
              <span>Organization profile updated successfully.</span>
            </div>
          )}

          {profileError && (
            <div className="mb-4 p-3 rounded-input bg-danger border border-danger text-midnight text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-midnight" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Company Trade Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Legal Entity Name</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Official registered company name"
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Tax Identification / INN</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="e.g. UZ 309 482 114"
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Base Operating Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
                >
                  <option value="USD">USD ($) - United States Dollar</option>
                  <option value="UZS">UZS (so&apos;m) - Uzbek Som</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="KZT">KZT (₸) - Kazakhstani Tenge</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#061336] mb-1">Headquarters Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Physical headquarters address"
                className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="py-2.5 px-5 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-white font-medium text-xs transition-colors disabled:opacity-50"
              >
                {savingProfile ? "Saving Profile..." : "Save Profile Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Branch Network */}
        <div className="p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#CFDBEE]">
            <div>
              <h2 className="font-light text-base text-[#061336]">Regional Hubs & Terminals</h2>
              <p className="text-xs text-[#3F5C96]">Physical distribution hubs and freight depots</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddBranch(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Hub
            </button>
          </div>

          {showAddBranch && (
            <form onSubmit={handleCreateBranch} className="mb-4 p-4 rounded-input bg-[#F4FEFF] border border-[#CFDBEE] space-y-3 text-xs">
              <div className="font-semibold text-[#061336]">Register New Branch / Depot</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Hub Name (e.g. Samarkand Cross-Dock)"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="p-2 rounded-input border border-[#CFDBEE] bg-white"
                />
                <input
                  type="text"
                  placeholder="Address / Coordinates"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className="p-2 rounded-input border border-[#CFDBEE] bg-white"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={branchPrimary}
                  onChange={(e) => setBranchPrimary(e.target.checked)}
                  className="rounded text-[#0E2F76]"
                />
                <span className="text-[#061336]">Designate as Primary Operations Terminal</span>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranch(false)}
                  className="px-3 py-1.5 rounded-full border border-[#CFDBEE] text-xs hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBranch}
                  className="px-4 py-1.5 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336]"
                >
                  {creatingBranch ? "Saving..." : "Create Hub"}
                </button>
              </div>
            </form>
          )}

          {branches.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#3F5C96]">
              No regional branches configured yet. Add your primary depot above.
            </div>
          ) : (
            <div className="space-y-2.5">
              {branches.map((b) => (
                <div key={b.id} className="p-3.5 rounded-input bg-[#ffffff] border border-[#CFDBEE] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-[#061336] flex items-center gap-2">
                      {b.name}
                      {b.is_primary && (
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-success text-midnight border border-success">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-[#3F5C96] text-[11px]">{b.address || "No address assigned"}</div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#0E2F76] font-semibold border border-blue-200 capitalize">
                    {b.status || "Active"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Developer API Keys */}
        <div className="p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#CFDBEE]">
            <div>
              <h2 className="font-light text-base text-[#061336]">Live Developer API Keys</h2>
              <p className="text-xs text-[#3F5C96]">Integrate telematics, TMS, or GPS hardware with your tenant</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddKey(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Issue API Key
            </button>
          </div>

          {newKeySecret && (
            <div className="mb-4 p-4 rounded-input bg-success border border-success text-xs space-y-2">
              <div className="font-semibold text-midnight flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-midnight" />
                API Key Generated — Copy Secret Now
              </div>
              <p className="text-midnight">
                This secret is stored hashed and will never be displayed again. Save it securely:
              </p>
              <div className="p-2.5 rounded bg-white border border-success font-mono text-midnight select-all break-all">
                {newKeySecret}
              </div>
              <button
                type="button"
                onClick={() => setNewKeySecret(null)}
                className="text-[11px] text-midnight underline font-medium"
              >
                I have saved this key safely
              </button>
            </div>
          )}

          {showAddKey && (
            <form onSubmit={handleCreateApiKey} className="mb-4 p-4 rounded-input bg-[#F4FEFF] border border-[#CFDBEE] space-y-3 text-xs">
              <div className="font-semibold text-[#061336]">Issue New API Secret Key</div>
              <input
                type="text"
                required
                placeholder="Key Name / Integration Label (e.g. Telematics GPS Gateway)"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full p-2.5 rounded-input border border-[#CFDBEE] bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddKey(false)}
                  className="px-3 py-1.5 rounded-full border border-[#CFDBEE] text-xs hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingKey}
                  className="px-4 py-1.5 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336]"
                >
                  {creatingKey ? "Issuing..." : "Generate Key"}
                </button>
              </div>
            </form>
          )}

          {apiKeys.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#3F5C96]">
              No API keys provisioned for this organization.
            </div>
          ) : (
            <div className="space-y-2.5">
              {apiKeys.map((k) => (
                <div key={k.id} className="p-3.5 rounded-input bg-[#ffffff] border border-[#CFDBEE] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-semibold text-[#061336] flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-[#0E2F76]" />
                      {k.prefix}… ({k.name})
                    </div>
                    <div className="text-[10px] text-[#3F5C96] mt-0.5 font-mono">
                      Created: {new Date(k.created_at).toLocaleDateString()} · Scopes: {k.scopes.join(", ") || "Full"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeKey(k.id)}
                    className="p-1.5 rounded-full text-danger hover:bg-danger/15 transition-colors"
                    title="Revoke Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

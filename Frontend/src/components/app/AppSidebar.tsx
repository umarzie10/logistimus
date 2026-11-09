"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  Truck,
  Route as RouteIcon,
  Warehouse,
  Users,
  DollarSign,
  BarChart3,
  Bot,
  Settings,
  ChevronDown,
  Building2,
  UserCheck,
  Check,
  Bell,
  FileText,
  Activity,
} from "lucide-react";
import { authApi, organizationApi, MembershipItem, OrgProfile } from "@/lib/api";

const WORKSPACE_NAV = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: Package },
  { name: "Dispatch", href: "/dispatch", icon: RouteIcon },
  { name: "Fleet", href: "/fleet", icon: Truck },
  { name: "Drivers", href: "/drivers", icon: UserCheck },
  { name: "Warehouse", href: "/warehouse", icon: Warehouse },
  { name: "CRM", href: "/crm", icon: Users },
  { name: "Finance", href: "/finance", icon: DollarSign },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const MANAGEMENT_NAV = [
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "AI Assistant", href: "/ai", icon: Bot, isNew: true },
];

const CONFIG_NAV = [
  { name: "Company Settings", href: "/settings", icon: Settings },
];

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [organizations, setOrganizations] = useState<MembershipItem[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrgProfile | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    async function loadWorkspaces() {
      try {
        const [sessionData, mineData] = await Promise.all([
          authApi.session().catch(() => null),
          organizationApi.getMine().catch(() => null),
        ]);
        if (sessionData?.organization) {
          setCurrentOrg(sessionData.organization);
        }
        if (mineData?.results) {
          setOrganizations(mineData.results);
        }
      } catch {
        // Fallback gracefully
      }
    }

    loadWorkspaces();
  }, []);

  async function handleSwitchWorkspace(orgId: string) {
    if (currentOrg && currentOrg.id === orgId) {
      setWorkspaceOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await authApi.switchOrganization(orgId);
      window.location.reload();
    } catch (err) {
      alert("Failed to switch workspace. Please check your network.");
      setSwitching(false);
    }
  }

  return (
    <aside className="w-64 bg-[#061336] text-[#FFFFFF] flex flex-col h-full border-r border-[#2a4a8e] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#2a4a8e]/60 gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 flex-shrink-0">
            <Image
              src="/logo-transparent.png"
              alt="Logistimus Logo"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-semibold text-lg tracking-tight text-[#FFFFFF]">
            Logistimus
          </span>
        </Link>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#0E2F76] text-[#A9C0E0] ml-auto">
          v0.1.0
        </span>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {/* WORKSPACE GROUP */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#A9C0E0]/60">
            Workspace
          </div>
          <div className="space-y-0.5">
            {WORKSPACE_NAV.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#0E2F76] text-[#FFFFFF] font-medium"
                      : "text-[#A9C0E0] hover:bg-[#0E2F76]/40 hover:text-[#FFFFFF]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#F4FEFF]" : "text-[#A9C0E0]"}`} />
                  <span className="flex-1">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* MANAGEMENT GROUP */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#A9C0E0]/60">
            Management
          </div>
          <div className="space-y-0.5">
            {MANAGEMENT_NAV.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#0E2F76] text-[#FFFFFF] font-medium"
                      : "text-[#A9C0E0] hover:bg-[#0E2F76]/40 hover:text-[#FFFFFF]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#F4FEFF]" : "text-[#A9C0E0]"}`} />
                  <span className="flex-1">{item.name}</span>
                  {item.isNew && (
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-success/20 text-success font-semibold">
                      Connected
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* CONFIGURATION GROUP */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#A9C0E0]/60">
            Configuration
          </div>
          <div className="space-y-0.5">
            {CONFIG_NAV.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#0E2F76] text-[#FFFFFF] font-medium"
                      : "text-[#A9C0E0] hover:bg-[#0E2F76]/40 hover:text-[#FFFFFF]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#F4FEFF]" : "text-[#A9C0E0]"}`} />
                  <span className="flex-1">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Real Dynamic Workspace Selector */}
      <div className="p-3 border-t border-[#2a4a8e]/60 bg-[#061336] relative">
        {workspaceOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#061336] border border-[#2a4a8e] rounded-card p-2 space-y-1 shadow-none z-50 animate-in fade-in duration-100">
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-[#A9C0E0]/60">
              Switch Organization
            </div>
            {organizations.length === 0 ? (
              <div className="p-2 text-xs text-[#A9C0E0]">No additional workspaces</div>
            ) : (
              organizations.map((org) => {
                const isSelected = currentOrg?.id === org.organization_id;
                return (
                  <button
                    key={org.organization_id}
                    type="button"
                    disabled={switching}
                    onClick={() => handleSwitchWorkspace(org.organization_id)}
                    className={`w-full flex items-center justify-between p-2 rounded-full text-left transition-colors ${
                      isSelected
                        ? "bg-[#0E2F76] text-[#FFFFFF]"
                        : "text-[#A9C0E0] hover:bg-[#0E2F76]/40 hover:text-[#FFFFFF]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#0a2156] text-[#FFFFFF] flex items-center justify-center font-semibold text-[11px] flex-shrink-0">
                        {org.organization_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{org.organization_name}</div>
                        <div className="text-[9px] font-mono text-[#A9C0E0]/80 truncate">Role: {org.role}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          aria-label="Switch active workspace"
          className="w-full flex items-center justify-between p-2 rounded-full hover:bg-[#0E2F76]/40 transition-colors border border-transparent hover:border-[#2a4a8e] text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#0E2F76] text-[#FFFFFF] flex items-center justify-center font-semibold text-xs flex-shrink-0 border border-[#2a4a8e]">
              {currentOrg?.name?.charAt(0).toUpperCase() || "L"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate text-[#FFFFFF]">
                {currentOrg?.name || "Active Workspace"}
              </div>
              <div className="text-[10px] font-mono text-[#A9C0E0]/80 truncate">
                {currentOrg?.slug || "logistimus-tenant"}
              </div>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#A9C0E0] transition-transform flex-shrink-0 ${
              workspaceOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
    </aside>
  );
}

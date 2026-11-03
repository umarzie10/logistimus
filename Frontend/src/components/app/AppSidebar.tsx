"use client";

import { useState } from "react";
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
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: Package, badge: "12" },
  { name: "Fleet", href: "/fleet", icon: Truck },
  { name: "Dispatch", href: "/dispatch", icon: RouteIcon },
  { name: "Drivers", href: "/drivers", icon: UserCheck },
  { name: "Warehouse", href: "/warehouse", icon: Warehouse },
  { name: "CRM", href: "/crm", icon: Users },
  { name: "Finance", href: "/finance", icon: DollarSign },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Notifications", href: "/notifications", icon: Bell, badge: "3" },
  { name: "AI Assistant", href: "/ai", icon: Bot, isNew: true },
  { name: "Settings", href: "/settings", icon: Settings },
];

const WORKSPACES = [
  { name: "Central Logistics Hub", slug: "demo-logistimus", code: "L" },
  { name: "Samarkand Regional Yard", slug: "sam-yard-01", code: "S" },
  { name: "Tashkent Air Cargo Depot", slug: "tas-air-04", code: "T" },
];

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [currentWs, setCurrentWs] = useState(WORKSPACES[0]);

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
          v2.4
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-[#A9C0E0]/60">
          Platform Modules
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#0E2F76] text-[#FFFFFF] font-medium"
                  : "text-[#A9C0E0] hover:bg-[#0E2F76]/40 hover:text-[#FFFFFF]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#F4FEFF]" : "text-[#A9C0E0]"}`} />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#0a2156] text-[#F4FEFF]">
                  {item.badge}
                </span>
              )}
              {item.isNew && (
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-success/20 text-success font-semibold">
                  Live
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-[#A9C0E0]/60">
          Dedicated Portals
        </div>
        <Link
          href="/portal"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-full text-sm text-[#A9C0E0] hover:bg-[#0E2F76]/40 hover:text-[#FFFFFF]"
        >
          <Building2 className="w-4 h-4 text-[#A9C0E0]" />
          <span>Customer Portal</span>
        </Link>
        <Link
          href="/driver"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-full text-sm text-[#A9C0E0] hover:bg-[#0E2F76]/40 hover:text-[#FFFFFF]"
        >
          <Truck className="w-4 h-4 text-[#A9C0E0]" />
          <span>Driver Mobile App</span>
        </Link>
        <Link
          href="/admin"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-full text-sm text-[#A9C0E0] hover:bg-[#0E2F76]/40 hover:text-[#FFFFFF]"
        >
          <LayoutDashboard className="w-4 h-4 text-[#A9C0E0]" />
          <span>Super Admin</span>
        </Link>
      </nav>

      {/* Workspace Selector */}
      <div className="p-3 border-t border-[#2a4a8e]/60 bg-[#061336] relative">
        {workspaceOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#061336] border border-[#2a4a8e] rounded-card p-2 space-y-1 shadow-none z-50 animate-in fade-in duration-100">
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-[#A9C0E0]/60">
              Switch Workspace
            </div>
            {WORKSPACES.map((ws) => (
              <button
                key={ws.slug}
                type="button"
                onClick={() => {
                  setCurrentWs(ws);
                  setWorkspaceOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-full text-left transition-colors ${
                  currentWs.slug === ws.slug
                    ? "bg-[#0E2F76] text-[#FFFFFF]"
                    : "text-[#A9C0E0] hover:bg-[#0E2F76]/40 hover:text-[#FFFFFF]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#0a2156] text-[#FFFFFF] flex items-center justify-center font-semibold text-[11px] flex-shrink-0">
                    {ws.code}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{ws.name}</div>
                    <div className="text-[9px] font-mono text-[#A9C0E0]/80 truncate">{ws.slug}</div>
                  </div>
                </div>
                {currentWs.slug === ws.slug && (
                  <Check className="w-3.5 h-3.5 text-success flex-shrink-0 ml-1" />
                )}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setWorkspaceOpen((v) => !v)}
          aria-expanded={workspaceOpen}
          aria-label="Switch active workspace"
          className="w-full flex items-center justify-between p-2.5 rounded-full bg-[#0E2F76]/40 hover:bg-[#0E2F76]/70 text-left transition-colors border border-[#2a4a8e]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#0E2F76] text-[#FFFFFF] flex items-center justify-center font-semibold text-xs flex-shrink-0">
              {currentWs.code}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#FFFFFF] truncate">
                {currentWs.name}
              </div>
              <div className="text-[10px] font-mono text-[#A9C0E0] truncate">
                {currentWs.slug}
              </div>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#A9C0E0] flex-shrink-0 ml-1 transition-transform ${
              workspaceOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
    </aside>
  );
}

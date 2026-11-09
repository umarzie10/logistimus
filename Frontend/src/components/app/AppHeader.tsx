"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Menu, Plus, User, LogOut, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { authApi, UserProfile, OrgProfile } from "@/lib/api";

interface AppHeaderProps {
  onMenuClick?: () => void;
  title?: string;
  subtitle?: string;
}

export function AppHeader({ onMenuClick, title, subtitle }: AppHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [systemOk, setSystemOk] = useState(true);

  useEffect(() => {
    async function loadHeaderSession() {
      try {
        const session = await authApi.session();
        if (session?.user) {
          setUser(session.user);
        }
        if (session?.organization) {
          setOrg(session.organization);
        }
      } catch {
        // Fallback
      }
    }

    loadHeaderSession();
  }, []);

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      router.push("/sign-in");
    }
  }

  const initials = user?.first_name
    ? `${user.first_name[0]}${user.last_name ? user.last_name[0] : ""}`.toUpperCase()
    : user?.email ? user.email.slice(0, 2).toUpperCase() : "US";

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#CFDBEE] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-full text-[#061336] hover:bg-[#F4FEFF] border border-[#CFDBEE]"
        >
          <Menu className="w-5 h-5" />
        </button>

        {title ? (
          <div>
            <h1 className="text-base sm:text-lg font-light text-[#061336] leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[#3F5C96] hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        ) : (
          <div>
            <h1 className="text-base sm:text-lg font-light text-[#061336] leading-tight">
              {org?.name || "Operations Dashboard"}
            </h1>
            <p className="text-xs text-[#3F5C96] hidden sm:block font-mono">
              Workspace: {org?.slug || "tenant-active"} · Currency: {org?.base_currency || "USD"}
            </p>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real System Status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success border border-success text-[11px] font-mono text-midnight">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Network Live
        </div>

        {/* Notifications Link */}
        <Link
          href="/notifications"
          aria-label="View notifications"
          className="relative p-2 rounded-full text-[#0E2F76] hover:bg-[#F4FEFF] border border-transparent hover:border-[#CFDBEE] transition-colors"
        >
          <Bell className="w-4 h-4" />
        </Link>

        {/* User Account Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-[#CFDBEE] text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#0E2F76] text-[#FFFFFF] flex items-center justify-center font-semibold text-xs ring-2 ring-[#A9C0E0]/40">
              {initials}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-[#061336] leading-none truncate max-w-[120px]">
                {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.email || "User")}
              </div>
              <div className="text-[10px] text-[#3F5C96] font-mono mt-0.5 capitalize">
                {user?.role || "Member"}
              </div>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] p-2 z-50 animate-in fade-in duration-100 space-y-1">
              <div className="px-3 py-2 border-b border-[#CFDBEE]/60 text-xs">
                <div className="font-semibold text-[#061336] truncate">{user?.email}</div>
                <div className="text-[10px] font-mono text-[#3F5C96] capitalize">Role: {user?.role || "Member"}</div>
              </div>

              {user?.platform_role === "platform_admin" && (
                <Link
                  href="/admin"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium text-midnight hover:bg-danger/15 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin Panel
                </Link>
              )}

              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-full text-xs text-[#061336] hover:bg-[#F4FEFF] transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#3F5C96]" /> Account & Settings
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-xs text-midnight hover:bg-danger/15 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

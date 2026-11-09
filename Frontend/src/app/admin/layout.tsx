"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldAlert,
  Building,
  Activity,
  FileText,
  Sliders,
  LogOut,
  ArrowLeft,
  Server,
  Lock,
} from "lucide-react";
import { authApi, UserProfile } from "@/lib/api";

const SUPERADMIN_NAV = [
  { name: "Platform Overview", href: "/admin", icon: Sliders },
  { name: "Tenant Organizations", href: "/admin/organizations", icon: Building },
  { name: "Global Audit Logs", href: "/admin/audit", icon: FileText },
  { name: "System Health & PostGIS", href: "/admin/system", icon: Server },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    async function checkPlatformAuth() {
      try {
        const session = await authApi.session();
        if (session?.user) {
          setUser(session.user);
          if (session.user.platform_role !== "platform_admin") {
            setDenied(true);
          }
        } else {
          setDenied(true);
        }
      } catch {
        setDenied(true);
      } finally {
        setLoading(false);
      }
    }

    checkPlatformAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040C24] flex items-center justify-center text-[#A9C0E0] text-xs font-mono">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 animate-spin text-[#0E2F76]" />
          Verifying Platform Security Clearance...
        </div>
      </div>
    );
  }

  if (denied || !user) {
    return (
      <div className="min-h-screen bg-[#040C24] flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-[#061336] border border-red-500/40 rounded-card p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-xl font-light text-white tracking-tight">Access Restricted</h1>
          <p className="text-xs text-[#A9C0E0] leading-relaxed">
            This platform environment is strictly reserved for verified Logistimus Platform Administrators.
            Organization-level credentials do not grant access to global platform infrastructure.
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="py-2.5 px-4 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-white text-xs font-medium border border-[#2a4a8e] transition-colors"
            >
              Return to Organization Workspace
            </Link>
            <Link
              href="/sign-in"
              className="text-xs text-[#A9C0E0] hover:text-white underline pt-1"
            >
              Sign in with different credentials
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040C24] text-white flex flex-col">
      {/* Admin Global Header */}
      <header className="h-16 border-b border-[#1c356b] bg-[#061336] px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-7 h-7">
              <Image src="/logo-transparent.png" alt="Logistimus" fill className="object-contain" />
            </div>
            <span className="font-semibold text-base tracking-tight text-white">
              Logistimus <span className="font-light text-[#A9C0E0]">Admin</span>
            </span>
          </Link>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/60 text-red-400 font-semibold border border-red-500/40">
            ADMIN
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#A9C0E0] hidden sm:inline">
            Admin: <strong className="text-white">{user.email}</strong>
          </span>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-[#A9C0E0] hover:text-white bg-[#0E2F76]/40 hover:bg-[#0E2F76] px-3 py-1.5 rounded-full border border-[#2a4a8e] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Tenant Workspace
          </Link>
          <button
            type="button"
            onClick={async () => {
              await authApi.logout();
              router.push("/sign-in");
            }}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-[#061336] border-r border-[#1c356b] p-4 flex flex-col justify-between">
          <nav className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#A9C0E0]/60">
              Platform Controls
            </div>
            {SUPERADMIN_NAV.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#0E2F76] text-white border border-[#2a4a8e]"
                      : "text-[#A9C0E0] hover:bg-[#0E2F76]/30 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-4 border-t border-[#1c356b] text-[10px] font-mono text-[#A9C0E0]/60 space-y-1 px-3">
            <div>Logistimus Core v0.1.0</div>
            <div>PostGIS 3.4 / PostgreSQL 16</div>
            <div className="text-emerald-400">RLS Policies Enforced</div>
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

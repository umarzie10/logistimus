"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Bell, Menu, Plus, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

interface AppHeaderProps {
  onMenuClick?: () => void;
  title?: string;
  subtitle?: string;
}

export function AppHeader({ onMenuClick, title, subtitle }: AppHeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);

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
          <div className="relative w-64 sm:w-80 hidden md:block">
            <Search className="w-4 h-4 text-[#3F5C96] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search orders, vehicles, drivers, shipments..."
              className="w-full pl-9 pr-3 py-1.5 rounded-input bg-[#ffffff] border border-[#CFDBEE] text-xs text-[#061336] placeholder-[#3F5C96] focus:outline-none focus:border-[#0E2F76] transition-colors"
            />
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Create Action */}
        <Link
          href="/orders?new=true"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium hover:bg-[#061336] transition-colors "
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Order</span>
        </Link>

        {/* Status indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 border border-success/40 text-[11px] font-mono text-midnight">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Live Network
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="View notifications"
            aria-expanded={notifOpen}
            className="relative p-2 rounded-full text-[#0E2F76] hover:bg-[#F4FEFF] border border-transparent hover:border-[#CFDBEE] transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-white" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] p-4 shadow-none z-50 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-[#CFDBEE]">
                <span className="font-semibold text-xs text-[#061336]">Operational Alerts</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-danger/15 text-midnight">
                  3 Unread
                </span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="p-2.5 rounded-input bg-[#F4FEFF] border border-[#CFDBEE]/70 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-semibold text-[#061336] text-[11px]">
                      Kamchik Pass Weather Warning
                    </div>
                    <div className="text-[10px] text-[#3F5C96]">
                      Snowfall advisory on M-39 km 140–180. 4 dispatches rerouted.
                    </div>
                  </div>
                </div>
                <div className="p-2.5 rounded-input bg-white border border-[#CFDBEE]/70 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-semibold text-[#061336] text-[11px]">
                      Order ORD-24102 Delivered
                    </div>
                    <div className="text-[10px] text-[#3F5C96]">
                      E-POD confirmed at Tashkent Medical Center.
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-[#CFDBEE] flex justify-end">
                <Link
                  href="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-medium text-[#0E2F76] hover:underline flex items-center gap-1"
                >
                  Notification Center <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Account */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-[#CFDBEE]">
          <div className="w-8 h-8 rounded-full bg-[#0E2F76] text-[#FFFFFF] flex items-center justify-center font-semibold text-xs ring-2 ring-[#A9C0E0]/40">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-[#061336] leading-none">
              Alisher D.
            </div>
            <div className="text-[10px] text-[#3F5C96] font-mono mt-0.5">
              Operations Director
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

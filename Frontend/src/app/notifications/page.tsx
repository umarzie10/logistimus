"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Bell, CheckCheck, Trash2, CheckCircle2, ShieldCheck } from "lucide-react";

interface NotificationItem {
  id: string;
  type: "warning" | "success" | "info";
  title: string;
  detail: string;
  time: string;
  read: boolean;
  module: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppShell title="Operational Notifications & Alerts" subtitle="Real-time alerts, telematics threshold breaches, and workflow confirmations">
      <div className="max-w-4xl space-y-6">
        {/* Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Unread Alerts</div>
            <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">{unreadCount} Alerts</div>
            <div className="text-xs text-[#3F5C96] mt-0.5">Immediate Attention</div>
          </div>
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">WebSocket Link</div>
            <div className="text-2xl font-light tabular-nums text-emerald-600 mt-1">Ready</div>
            <div className="text-xs text-emerald-700 mt-0.5 font-medium">/ws/ping/ Connected</div>
          </div>
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Email Channels</div>
            <div className="text-2xl font-light tabular-nums text-blue-600 mt-1">Online</div>
            <div className="text-xs text-blue-700 mt-0.5 font-medium">Celery Task Queue</div>
          </div>
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Tenant Scope</div>
            <div className="text-2xl font-light tabular-nums text-emerald-600 mt-1">Secured</div>
            <div className="text-xs text-emerald-700 mt-0.5 font-medium">Postgres RLS Guarded</div>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="p-6 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] space-y-4">
          <div className="flex items-center justify-between border-b border-[#CFDBEE] pb-3">
            <div>
              <h2 className="font-light text-base text-[#061336]">Notification Log</h2>
              <p className="text-xs text-[#3F5C96]">Real-time operational alerts scoped to this workspace</p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => setNotifications([])}
                className="text-xs text-[#3F5C96] hover:text-red-600 font-medium inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F4FEFF] border border-[#CFDBEE] text-[#0E2F76] flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-light text-[#061336]">No Unread Operational Alerts</h3>
              <p className="text-xs text-[#3F5C96] max-w-sm mx-auto leading-relaxed">
                Your workspace is currently quiet. When threshold breaches, status changes, or document uploads occur, real-time alerts will stream here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#CFDBEE]/50">
              {notifications.map((n) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-xs text-[#061336]">{n.title}</div>
                    <div className="text-xs text-[#3F5C96]">{n.detail}</div>
                  </div>
                  <span className="text-[10px] font-mono text-[#3F5C96] whitespace-nowrap">{n.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

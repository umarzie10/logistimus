"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Trash2,
  CheckCheck,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: "warning" | "success" | "info";
  title: string;
  detail: string;
  time: string;
  read: boolean;
  module: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    type: "warning",
    title: "Kamchik Pass Weather Advisory",
    detail: "High mountain snowfall reported on M-39 corridor km 140–180. 4 dispatches automatically rerouted via southern bypass.",
    time: "12m ago",
    read: false,
    module: "Dispatch & Route",
  },
  {
    id: "notif-2",
    type: "success",
    title: "Consignment ORD-24102 Delivered",
    detail: "Digital e-POD signed by Elena Rostova at Tashkent Medical Center. Cold-chain temperature stayed within 2-8°C setpoint.",
    time: "48m ago",
    read: false,
    module: "Orders",
  },
  {
    id: "notif-3",
    type: "warning",
    title: "Vehicle TRK-09 Scheduled Service Due",
    detail: "Odometer reached 312,800 km. Scheduled hydraulic fluid flush and brake caliper inspection recommended within 400 km.",
    time: "2h ago",
    read: false,
    module: "Fleet",
  },
  {
    id: "notif-4",
    type: "info",
    title: "Client Invoice INV-2026-0881 Settled",
    detail: "Northwind Freight Corp settled $38,400.00 via corporate bank wire transfer. Receipt auto-logged to finance ledger.",
    time: "4h ago",
    read: true,
    module: "Finance",
  },
  {
    id: "notif-5",
    type: "success",
    title: "WMS Inventory Pallet Receipt Verified",
    detail: "Dock Bay 01 completed intake of 340 units (SKU-9921) to Aisle B-04 / Rack 2.",
    time: "6h ago",
    read: true,
    module: "Warehouse",
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread" | "warning">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "warning") return n.type === "warning";
    return true;
  });

  return (
    <AppShell
      title="Notification Center"
      subtitle="Operational alerts, delivery receipts, telematics flags and system messages"
    >
      {/* Top Filter & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-[#0E2F76] text-[#FFFFFF]"
                : "bg-[#FFFFFF] border border-[#CFDBEE] text-[#061336] hover:bg-[#F4FEFF]"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === "unread"
                ? "bg-[#0E2F76] text-[#FFFFFF]"
                : "bg-[#FFFFFF] border border-[#CFDBEE] text-[#061336] hover:bg-[#F4FEFF]"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("warning")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === "warning"
                ? "bg-[#0E2F76] text-[#FFFFFF]"
                : "bg-[#FFFFFF] border border-[#CFDBEE] text-[#061336] hover:bg-[#F4FEFF]"
            }`}
          >
            Warnings
          </button>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#CFDBEE] bg-[#FFFFFF] text-xs font-medium text-[#0E2F76] hover:bg-[#F4FEFF]"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#CFDBEE] bg-[#FFFFFF] text-xs font-medium text-danger hover:bg-danger/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear list</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List Card */}
      <div className="rounded-card bg-[#FFFFFF] border border-[#CFDBEE] divide-y divide-[#CFDBEE]/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0E2F76] flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-light text-[#061336]">No Notifications in this View</h3>
            <p className="text-xs text-[#3F5C96]">
              All operational telemetry, driver alerts, and client shipments are currently in sync.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleRead(item.id)}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                item.read ? "bg-[#FFFFFF] hover:bg-[#F4FEFF]" : "bg-blue-50/40 hover:bg-blue-50/60"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.type === "warning"
                      ? "bg-warning/15 text-midnight"
                      : item.type === "success"
                      ? "bg-success/15 text-midnight"
                      : "bg-[#dbe9f5] text-[#0E2F76]"
                  }`}
                >
                  {item.type === "warning" && <AlertTriangle className="w-4 h-4 text-warning" />}
                  {item.type === "success" && <CheckCircle2 className="w-4 h-4 text-success" />}
                  {item.type === "info" && <Info className="w-4 h-4 text-[#0E2F76]" />}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs text-[#061336]">{item.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#dbe9f5] text-[#0E2F76]">
                      {item.module}
                    </span>
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-danger inline-block" title="Unread" />
                    )}
                  </div>
                  <p className="text-xs text-[#3F5C96] leading-relaxed">{item.detail}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#3F5C96] flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>{item.time}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}

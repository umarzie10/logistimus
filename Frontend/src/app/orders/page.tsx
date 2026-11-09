"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { downloadTextFile, toCsv } from "@/lib/download";
import {
  Search,
  Plus,
  Download,
  Eye,
  X,
  Package,
} from "lucide-react";

interface Order {
  id: string;
  customer: string;
  cargo: string;
  weight: string;
  origin: string;
  destination: string;
  driver: string;
  status: "In transit" | "Delivered" | "Loading" | "Delayed" | "Draft";
  created: string;
  eta: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // New order form state
  const [newCustomer, setNewCustomer] = useState("");
  const [newCargo, setNewCargo] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newDriver, setNewDriver] = useState("");

  const handleExportCsv = () => {
    const header = [
      "Order ID",
      "Customer",
      "Cargo",
      "Weight",
      "Origin",
      "Destination",
      "Driver",
      "Status",
      "Created",
      "ETA",
    ];
    const rows = filtered.map((o) => [
      o.id,
      o.customer,
      o.cargo,
      o.weight,
      o.origin,
      o.destination,
      o.driver,
      o.status,
      o.created,
      o.eta,
    ]);
    const csv = toCsv(header, rows);
    downloadTextFile("orders-export.csv", csv, "text/csv;charset=utf-8");
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer || !newOrigin || !newDestination) return;

    const newOrd: Order = {
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      customer: newCustomer.trim(),
      cargo: newCargo.trim() || "General Freight",
      weight: newWeight.trim() || "10,000 kg",
      origin: newOrigin.trim(),
      destination: newDestination.trim(),
      driver: newDriver.trim() || "Unassigned",
      status: "Draft",
      created: "Just now",
      eta: "Pending Dispatch",
    };

    setOrders((prev) => [newOrd, ...prev]);
    setNewCustomer("");
    setNewCargo("");
    setNewWeight("");
    setNewOrigin("");
    setNewDestination("");
    setNewDriver("");
    setModalOpen(false);
  };

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || o.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <AppShell title="Order Management" subtitle="Manage shipments, cargo manifests, and status timelines">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#3F5C96] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by order #, customer, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-input border border-[#CFDBEE] bg-[#FFFFFF] text-xs text-[#061336] focus:outline-none focus:border-[#0E2F76]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-input border border-[#CFDBEE] bg-[#FFFFFF] text-xs font-medium text-[#061336] focus:outline-none focus:border-[#0E2F76]"
          >
            <option value="all">All Statuses</option>
            <option value="in transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="loading">Loading</option>
            <option value="delayed">Delayed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#CFDBEE] bg-[#FFFFFF] text-xs font-medium text-[#0E2F76] hover:bg-[#F4FEFF]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-xs font-medium text-[#FFFFFF] "
          >
            <Plus className="w-4 h-4" />
            <span>Create New Order</span>
          </button>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="rounded-card bg-[#FFFFFF] border border-[#CFDBEE] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F4FEFF] border border-[#CFDBEE] text-[#0E2F76] flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-light text-[#061336]">No Orders Found in Workspace</h3>
            <p className="text-xs text-[#3F5C96] max-w-md mx-auto leading-relaxed">
              No freight consignments have been booked for this organization yet. The core Orders & Shipments REST module is scheduled for Phase 3. You can draft an order below.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E2F76] text-white text-xs font-medium hover:bg-[#061336]"
              >
                <Plus className="w-3.5 h-3.5" /> Draft Order Manifest
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#CFDBEE] bg-[#ffffff] text-[11px] font-mono uppercase text-[#3F5C96]">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Cargo / Weight</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Assigned Driver</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">ETA</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFDBEE]/50">
                {filtered.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#F4FEFF] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#0E2F76]">
                      {ord.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#061336]">
                      {ord.customer}
                    </td>
                    <td className="py-3.5 px-4 text-[#3F5C96]">
                      <div className="truncate max-w-[160px] font-medium text-[#061336]">{ord.cargo}</div>
                      <div className="font-mono text-[10px] text-[#3F5C96]">{ord.weight}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#3F5C96]">
                      <div className="text-[#061336] font-medium">{ord.origin}</div>
                      <div className="text-[10px] text-[#3F5C96]">→ {ord.destination}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#061336] font-medium">
                      {ord.driver}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[10px] border ${
                          ord.status === "In transit"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : ord.status === "Delivered"
                            ? "bg-success/15 text-midnight border-success/40"
                            : ord.status === "Loading"
                            ? "bg-warning/15 text-midnight border-warning/40"
                            : "bg-danger/15 text-midnight border-danger/40"
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#061336]">
                      {ord.eta}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="p-1.5 rounded-full text-[#0E2F76] hover:bg-[#dbe9f5] transition-colors"
                        title="Inspect Order Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#061336]/65 flex justify-end">
          <div className="w-full max-w-lg bg-[#FFFFFF] h-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#CFDBEE]">
                <div>
                  <span className="text-xs font-mono text-[#3F5C96]">Order Manifest</span>
                  <h2 className="text-xl font-light text-[#061336] tabular-nums">{selectedOrder.id}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-full text-[#3F5C96] hover:bg-[#ffffff]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 space-y-5 text-xs">
                <div>
                  <span className="font-mono text-[#3F5C96] uppercase tracking-wider block mb-1">Customer Account</span>
                  <div className="text-sm font-semibold text-[#061336]">{selectedOrder.customer}</div>
                </div>

                <div className="p-4 rounded-input bg-[#ffffff] border border-[#CFDBEE] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#3F5C96]">Cargo Type:</span>
                    <span className="font-semibold text-[#061336]">{selectedOrder.cargo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3F5C96]">Gross Weight:</span>
                    <span className="font-mono font-semibold text-[#061336]">{selectedOrder.weight}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3F5C96]">Assigned Transport:</span>
                    <span className="font-semibold text-[#0E2F76]">{selectedOrder.driver}</span>
                  </div>
                </div>

                <div>
                  <span className="font-mono text-[#3F5C96] uppercase tracking-wider block mb-2">Routing Journey</span>
                  <div className="border-l-2 border-[#0E2F76] pl-4 space-y-3">
                    <div>
                      <div className="text-[10px] font-mono text-[#3F5C96]">ORIGIN DEPARTURE</div>
                      <div className="font-semibold text-[#061336]">{selectedOrder.origin}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-[#3F5C96]">FINAL DESTINATION</div>
                      <div className="font-semibold text-[#061336]">{selectedOrder.destination}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#CFDBEE] flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-[#3F5C96]">Estimated: {selectedOrder.eta}</span>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#061336]/65 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-card border border-[#CFDBEE] p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFDBEE]">
              <h3 className="font-light text-base text-[#061336]">Draft New Order</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[#3F5C96]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#061336] mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samarkand Logistics LLC"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="w-full p-2 rounded-input border border-[#CFDBEE] bg-[#ffffff]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Origin City</label>
                  <input
                    type="text"
                    required
                    placeholder="Tashkent"
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    className="w-full p-2 rounded-input border border-[#CFDBEE] bg-[#ffffff]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Destination City</label>
                  <input
                    type="text"
                    required
                    placeholder="Bukhara"
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    className="w-full p-2 rounded-input border border-[#CFDBEE] bg-[#ffffff]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Cargo Description</label>
                  <input
                    type="text"
                    placeholder="Dry Freight, Consumer Goods"
                    value={newCargo}
                    onChange={(e) => setNewCargo(e.target.value)}
                    className="w-full p-2 rounded-input border border-[#CFDBEE] bg-[#ffffff]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#061336] mb-1">Gross Weight</label>
                  <input
                    type="text"
                    placeholder="12,000 kg"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full p-2 rounded-input border border-[#CFDBEE] bg-[#ffffff]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#CFDBEE]">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 rounded-full border border-[#CFDBEE] text-xs font-medium text-[#3F5C96]">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium hover:bg-[#061336]">
                  Save Draft Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

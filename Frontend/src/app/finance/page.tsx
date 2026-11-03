"use client";

import { AppShell } from "@/components/app/AppShell";
import { Download } from "lucide-react";
import { downloadTextFile, toCsv } from "@/lib/download";

const INVOICES = [
  { id: "INV-2026-0881", client: "Northwind Freight Corp", amount: "$38,400.00", status: "Paid", date: "Oct 28, 2026", due: "Net 30" },
  { id: "INV-2026-0882", client: "Axis Distribution Group", amount: "$19,250.00", status: "Pending", date: "Oct 29, 2026", due: "Due in 12 days" },
  { id: "INV-2026-0883", client: "Meridian Cargo LLC", amount: "$64,800.00", status: "Paid", date: "Oct 24, 2026", due: "Net 15" },
  { id: "INV-2026-0884", client: "Bluepeak Retail Stores", amount: "$22,100.00", status: "Pending", date: "Oct 30, 2026", due: "Due in 18 days" },
  { id: "INV-2026-0885", client: "Silk Road Textiles", amount: "$14,500.00", status: "Overdue", date: "Oct 12, 2026", due: "Overdue 4 days" },
];

export default function FinancePage() {
  const handleExportStatements = () => {
    const header = ["Invoice #", "Client Account", "Issue Date", "Payment Due", "Status", "Total Amount"];
    const rows = INVOICES.map((inv) => [
      inv.id,
      inv.client,
      inv.date,
      inv.due,
      inv.status,
      inv.amount,
    ]);
    const csv = toCsv(header, rows);
    downloadTextFile("billing-statements.csv", csv, "text/csv;charset=utf-8");
  };

  return (
    <AppShell title="Finance & Billing Center" subtitle="Revenue ledgers, client invoices, carrier settlements and automated billing">
      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Monthly Revenue</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">$482,900</div>
          <div className="text-xs text-midnight mt-0.5 font-semibold">+14.2% YoY growth</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Pending Invoices</div>
          <div className="text-2xl font-light tabular-nums text-[#0E2F76] mt-1">$41,350</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">2 client accounts outstanding</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Carrier Settlements</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">$194,200</div>
          <div className="text-xs text-midnight mt-0.5 font-semibold">100% on-time settlement</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] ">
          <div className="text-[11px] font-mono uppercase text-[#3F5C96]">Gross Operating Margin</div>
          <div className="text-2xl font-light tabular-nums text-midnight mt-1">26.8%</div>
          <div className="text-xs text-midnight mt-0.5 font-semibold">+2.4% vs budget</div>
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="rounded-card bg-[#FFFFFF] border border-[#CFDBEE] p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-light text-base text-[#061336]">Client Billing Invoices</h3>
          <button
            type="button"
            onClick={handleExportStatements}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#CFDBEE] text-xs font-medium text-[#0E2F76] hover:bg-[#ffffff]"
          >
            <Download className="w-3.5 h-3.5" /> Export Statements
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#CFDBEE] text-[11px] font-mono uppercase text-[#3F5C96]">
                <th className="pb-2.5">Invoice #</th>
                <th className="pb-2.5">Client Account</th>
                <th className="pb-2.5">Issue Date</th>
                <th className="pb-2.5">Payment Due</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFDBEE]/50">
              {INVOICES.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#ffffff]">
                  <td className="py-3 font-mono font-semibold text-[#0E2F76]">{inv.id}</td>
                  <td className="py-3 font-semibold text-[#061336]">{inv.client}</td>
                  <td className="py-3 text-[#3F5C96]">{inv.date}</td>
                  <td className="py-3 font-mono text-[#3F5C96]">{inv.due}</td>
                  <td className="py-3">
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        inv.status === "Paid"
                          ? "bg-success/15 text-midnight border-success/40"
                          : inv.status === "Pending"
                          ? "bg-warning/15 text-midnight border-warning/40"
                          : "bg-danger/15 text-midnight border-danger/40"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono font-semibold text-[#061336]">{inv.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

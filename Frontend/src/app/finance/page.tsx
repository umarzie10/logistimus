"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { DollarSign, Download, Plus, FileText, CheckCircle2 } from "lucide-react";
import { downloadTextFile, toCsv } from "@/lib/download";

interface Invoice {
  id: string;
  client: string;
  amount: string;
  status: string;
  date: string;
  due: string;
}

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const handleExportStatements = () => {
    const header = ["Invoice #", "Client Account", "Issue Date", "Payment Due", "Status", "Total Amount"];
    const rows = invoices.map((inv) => [
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
      {/* Financial Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Invoices Issued</div>
          <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">{invoices.length} Invoices</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Workspace Ledger</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Receivables</div>
          <div className="text-2xl font-light tabular-nums text-[#0E2F76] mt-1">$0.00</div>
          <div className="text-xs text-[#3F5C96] mt-0.5">Outstanding</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Finance Engine</div>
          <div className="text-2xl font-light tabular-nums text-blue-600 mt-1">Scheduled</div>
          <div className="text-xs text-blue-700 mt-0.5 font-medium">Phase 7 Ledger</div>
        </div>
        <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
          <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Currency Base</div>
          <div className="text-2xl font-light tabular-nums text-royal mt-1">USD ($)</div>
          <div className="text-xs text-muted mt-0.5 font-medium">Multi-Currency Ready</div>
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="rounded-card bg-[#FFFFFF] border border-[#CFDBEE] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#CFDBEE] pb-3">
          <div>
            <h3 className="font-light text-base text-[#061336]">Client Billing Invoices</h3>
            <p className="text-xs text-[#3F5C96]">Audited freight receivables, line items, and payment receipts</p>
          </div>
          {invoices.length > 0 && (
            <button
              type="button"
              onClick={handleExportStatements}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#CFDBEE] bg-[#ffffff] text-xs font-medium text-[#0E2F76] hover:bg-[#F4FEFF]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F4FEFF] border border-[#CFDBEE] text-[#0E2F76] flex items-center justify-center mx-auto">
              <DollarSign className="w-6 h-6" />
            </div>
            <h2 className="text-base font-light text-[#061336]">No Invoices Generated in Workspace</h2>
            <p className="text-xs text-[#3F5C96] max-w-md mx-auto leading-relaxed">
              Invoices, line-item tax calculations, and carrier settlements will populate when shipments are closed and billed. Multi-currency finance models land in backend Phase 7.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#CFDBEE] text-[10px] font-mono uppercase text-[#3F5C96]">
                  <th className="pb-3">Invoice #</th>
                  <th className="pb-3">Client Account</th>
                  <th className="pb-3">Issue Date</th>
                  <th className="pb-3">Due Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFDBEE]/50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F4FEFF]">
                    <td className="py-3 font-mono font-semibold text-[#0E2F76]">{inv.id}</td>
                    <td className="py-3 font-semibold text-[#061336]">{inv.client}</td>
                    <td className="py-3 text-[#3F5C96]">{inv.date}</td>
                    <td className="py-3 text-[#3F5C96]">{inv.due}</td>
                    <td className="py-3">{inv.status}</td>
                    <td className="py-3 text-right font-mono font-semibold text-[#061336]">{inv.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

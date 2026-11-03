"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime error
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F4FEFF] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-card border border-[#CFDBEE] p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-danger/15 text-midnight border border-danger/40 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-danger" />
        </div>
        <h1 className="text-xl font-light text-[#061336]">Operational Runtime Interruption</h1>
        <p className="text-xs text-[#3F5C96] leading-relaxed">
          An unexpected error occurred while processing this logistics view. Client state was safely preserved.
        </p>
        <div className="p-3 rounded-input bg-blue-50/50 border border-[#CFDBEE] text-[11px] font-mono text-[#3F5C96] truncate">
          {error.message || "Unknown error encountered"}
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium hover:bg-[#061336] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Request
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#CFDBEE] bg-[#FFFFFF] text-xs font-medium text-[#0E2F76] hover:bg-[#F4FEFF]"
          >
            <Home className="w-3.5 h-3.5" /> Control Plane
          </Link>
        </div>
      </div>
    </div>
  );
}

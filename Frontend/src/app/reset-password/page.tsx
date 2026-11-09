"use client";

import { useState, useEffect, Suspense, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Key, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken = searchParams.get("token") || "";

  const [token, setToken] = useState(queryToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (queryToken && !token) {
      setToken(queryToken);
    }
  }, [queryToken, token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError("Reset token is missing. Please check your reset link.");
      return;
    }
    if (!password || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await authApi.resetPassword(token.trim(), password);
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to reset password. Link may be expired.");
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4FEFF] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md bg-[#FFFFFF] rounded-card border border-[#CFDBEE] p-8 sm:p-10">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="relative w-8 h-8">
              <Image src="/logo-transparent.png" alt="Logistimus" fill className="object-contain" priority />
            </div>
            <span className="font-semibold text-xl tracking-tight text-[#061336]">Logistimus</span>
          </Link>
          <h1 className="text-2xl font-light text-[#061336]">Set New Password</h1>
          <p className="text-xs text-[#3F5C96] mt-2">
            Create a secure password with at least 8 characters for your company workspace.
          </p>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-base font-light text-[#061336]">Password Updated Successfully</h2>
            <p className="text-xs text-[#3F5C96] leading-relaxed">
              Your password has been changed and all prior sessions revoked. You can now access your workspace.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => router.push("/sign-in")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium hover:bg-[#061336] transition-colors"
              >
                Sign In to Platform <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-input bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!queryToken && (
              <div>
                <label className="block font-medium text-[#061336] mb-1">Reset Token</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#3F5C96] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter reset token from email"
                    className="w-full pl-10 pr-3 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-medium text-[#061336] mb-1">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#3F5C96] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-3 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#061336] mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#3F5C96] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-3 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-[#FFFFFF] font-medium text-xs transition-colors mt-2 disabled:opacity-50"
            >
              {loading ? "Updating Password..." : "Update Password"}
            </button>

            <div className="text-center pt-2">
              <Link href="/sign-in" className="text-xs font-medium text-[#0E2F76] hover:underline">
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4FEFF]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

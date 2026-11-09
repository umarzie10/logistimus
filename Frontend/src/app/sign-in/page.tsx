"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

export default function SignInPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.login(email.trim(), password);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === "email_not_verified") {
          router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
          return;
        }
        setError(err.message || "Failed to sign in. Please verify your credentials.");
      } else {
        setError("Unable to reach backend service. Please check your network.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4FEFF] flex flex-col justify-center lg:px-8">
      <div className="mx-auto w-full max-w-6xl grid lg:grid-cols-2 rounded-card overflow-hidden border border-[#CFDBEE] bg-[#FFFFFF] my-6">
        {/* Left Side: Login Form */}
        <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 mb-10">
              <div className="relative w-8 h-8">
                <Image
                  src="/logo-transparent.png"
                  alt="Logistimus Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-semibold tracking-tight text-[#061336]">
                Logistimus
              </span>
            </Link>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-light text-[#061336] tracking-tight">
                Sign in to your platform
              </h1>
              <p className="text-sm text-[#3F5C96]">
                Access your global logistics operating workspace.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 p-3 rounded-input bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#061336] uppercase tracking-wider mb-2">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#3F5C96] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#061336] uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-[#0E2F76] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#3F5C96] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#3F5C96] hover:text-[#061336]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded-full border-[#CFDBEE] text-[#0E2F76] focus:ring-[#0E2F76]"
                  />
                  <span className="text-xs text-[#3F5C96]">Remember this device (30 days)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-[#FFFFFF] font-medium text-sm transition-colors flex items-center justify-center gap-2 "
              >
                {loading ? "Authenticating workspace..." : "Sign In to Workspace"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>

          <div className="mt-10 pt-6 border-t border-[#CFDBEE]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#3F5C96]">
            <div>
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="font-medium text-[#0E2F76] hover:underline">
                Create company workspace
              </Link>
            </div>
            <div className="flex items-center gap-1 text-midnight font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-midnight" />
              TLS 1.3 · Secure Session
            </div>
          </div>
        </div>

        {/* Right Side: Hero Visual Feature */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-[#0E2F76] text-[#FFFFFF] relative overflow-hidden">
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#A9C0E0_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF]/10 border border-[#FFFFFF]/20 text-xs font-mono text-[#A9C0E0] mb-6">
              Connected Operations
            </div>
            <h2 className="text-3xl font-light leading-tight">
              Manage fleets, orders and warehouses in real time.
            </h2>
            <p className="mt-3 text-sm text-[#A9C0E0] leading-relaxed max-w-md">
              Connect multi-country highway corridors, live telematics, and warehouse storage through the unified Logistimus control plane.
            </p>
          </div>

          <div className="relative z-10 my-8 flex items-center justify-center">
            <div className="relative w-full h-64">
              <Image
                src="/images/truck-brand-transparent.webp"
                alt="Logistimus 3D Fleet Semi-Truck"
                fill
                className="object-contain scale-110"
                priority
              />
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-4 pt-6 border-t border-[#FFFFFF]/15 text-center">
            <div>
              <div className="text-sm font-medium text-[#F4FEFF]">Real-Time</div>
              <div className="text-[11px] text-[#A9C0E0] mt-0.5">GPS & ELD</div>
            </div>
            <div>
              <div className="text-sm font-medium text-[#F4FEFF]">Multi-Modal</div>
              <div className="text-[11px] text-[#A9C0E0] mt-0.5">Fleet Dispatch</div>
            </div>
            <div>
              <div className="text-sm font-medium text-[#F4FEFF]">Automated</div>
              <div className="text-[11px] text-[#A9C0E0] mt-0.5">WMS & Billing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

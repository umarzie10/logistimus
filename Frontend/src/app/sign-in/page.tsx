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
    <div className="sky min-h-screen flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      {/* Thin Royal rail lines (DESIGN.md §6.3) */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[9%] w-px bg-royal/20" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-[9%] w-px bg-royal/20" />

      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-[1.05fr_1fr] rounded-card overflow-hidden border border-line bg-white animate-hero-panel">
        {/* Left — brand panel: sky is a cover moment, this is the Royal block */}
        <div className="relative hidden lg:flex flex-col bg-royal text-ice overflow-hidden p-10 xl:p-12">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(65%_100%_at_50%_0%,rgba(169,192,224,0.35),transparent_70%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.14] bg-[radial-gradient(#A9C0E0_1px,transparent_1px)] [background-size:18px_18px]"
          />

          <div className="relative z-10 flex h-full flex-col">
            <span className="type-label inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-powder">
              <span className="size-1.5 rounded-full bg-success" aria-hidden />
              Connected operations
            </span>

            <h2 className="type-display mt-7 text-ice">Every load, one control plane.</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-powder">
              Fleet, orders, warehouses and billing — one operating workspace for your
              whole organization, across every country you move in.
            </p>

            <div className="relative mt-6 flex-1 min-h-[150px]">
              <Image
                src="/images/truck-brand-transparent.webp"
                alt="Logistimus 3D fleet semi-truck"
                fill
                className="object-contain scale-105"
                priority
              />
            </div>

            {/* Stacked pills — signature motif (DESIGN.md §6.1) */}
            <div className="mt-6 grid gap-3.5">
              <div className="rounded-card bg-ice px-6 py-4 text-center text-royal">
                <div className="text-[16px] font-light uppercase tracking-[0.06em]">Real-time</div>
                <div className="mt-0.5 text-sm opacity-85">GPS &amp; ELD tracking</div>
              </div>
              <div className="rounded-card bg-powder px-6 py-4 text-center text-royal">
                <div className="text-[16px] font-light uppercase tracking-[0.06em]">Multi-modal</div>
                <div className="mt-0.5 text-sm opacity-85">Fleet dispatch</div>
              </div>
              <div className="rounded-card border border-white/25 bg-royal px-6 py-4 text-center text-ice">
                <div className="text-[16px] font-light uppercase tracking-[0.06em]">Automated</div>
                <div className="mt-0.5 text-sm opacity-85">WMS &amp; billing</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="relative size-9">
              <Image
                src="/logo-transparent.png"
                alt="Logistimus logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xl font-semibold tracking-tight text-midnight">
              Logistimus
            </span>
          </Link>

          <h1 className="type-heading mt-9 text-midnight">Welcome back.</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to your organization&apos;s workspace.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-input bg-danger px-3.5 py-3 text-xs text-midnight"
            >
              <AlertCircle className="size-4 shrink-0 mt-px" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="email" className="type-label block text-muted">
                Work email
              </label>
              <div className="relative mt-2">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                  aria-hidden
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="h-12 w-full rounded-input border border-powder bg-white pl-11 pr-4 text-[15px] text-royal transition-colors placeholder:text-blue-500 focus:border-royal"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="type-label text-muted">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-royal hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-2">
                <Lock
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                  aria-hidden
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-input border border-powder bg-white pl-11 pr-12 text-[15px] text-royal transition-colors placeholder:text-blue-500 focus:border-royal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-blue-500 transition-colors hover:text-royal"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                defaultChecked
                className="size-4 rounded-full border-line accent-royal"
              />
              <span className="text-xs text-muted">Remember this device (30 days)</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-royal px-6 text-[15px] font-medium text-ice transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight className="size-4" />}
            </button>
          </form>

          <div className="mt-9 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:flex-wrap">
            <div>
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="font-medium text-royal hover:underline">
                Create company workspace
              </Link>
            </div>
            <div className="type-mono flex items-center gap-1.5 whitespace-nowrap text-midnight">
              <ShieldCheck className="size-3.5" aria-hidden />
              TLS 1.3 · Secure session
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

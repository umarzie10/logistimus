"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Building, Mail, Lock, Phone, User, AlertCircle } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") || "starter";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fleetSize, setFleetSize] = useState("10 – 50 Vehicles");
  const [terms, setTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!terms) {
      setError("You must agree to the Master Service Agreement and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      await authApi.register({
        companyName: companyName.trim(),
        email: email.trim(),
        password,
        full_name: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        acceptTerms: true,
        tier: tier,
      });

      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to register organization.");
      } else {
        setError("Unable to reach backend service. Please check your network.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-input border border-powder bg-white pl-11 pr-4 text-[15px] text-royal transition-colors placeholder:text-blue-500 focus:border-royal";

  return (
    <div className="sky min-h-screen flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      {/* Thin Royal rail lines (DESIGN.md §6.3) */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[9%] w-px bg-royal/20" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-[9%] w-px bg-royal/20" />

      <div className="relative z-10 w-full max-w-[1080px] grid lg:grid-cols-[340px_1fr] rounded-card overflow-hidden border border-line bg-white animate-hero-panel">
        {/* Left — brand panel */}
        <div className="relative hidden lg:flex flex-col bg-royal text-ice overflow-hidden p-10">
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
              14-day trial
            </span>

            <h2 className="mt-7 text-[clamp(30px,2.4vw,38px)] font-light leading-[1.1] tracking-display text-ice">
              Create your company workspace.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-powder">
              Start on the {tier} tier. No credit card required.
            </p>

            <div className="relative mt-6 flex-1 min-h-[140px]">
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
              <div className="rounded-card bg-ice px-5 py-4 text-center text-royal">
                <div className="text-[16px] font-light uppercase tracking-[0.06em]">Your plan</div>
                <div className="mt-0.5 text-sm capitalize opacity-85">{tier} tier</div>
              </div>
              <div className="rounded-card bg-powder px-5 py-4 text-center text-royal">
                <div className="text-[16px] font-light uppercase tracking-[0.06em]">Trial</div>
                <div className="mt-0.5 text-sm opacity-85">14 days · no card</div>
              </div>
              <div className="rounded-card border border-white/25 bg-royal px-5 py-4 text-center text-ice">
                <div className="text-[16px] font-light uppercase tracking-[0.06em]">Next</div>
                <div className="mt-0.5 text-sm opacity-85">Verify email to start</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="p-8 sm:p-12 lg:p-14">
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

          <h1 className="type-heading mt-8 text-midnight">Register your organization</h1>
          <p className="mt-2 text-sm text-muted">
            Selected tier:{" "}
            <span className="font-medium capitalize text-midnight">{tier}</span> · 14-day
            enterprise trial. No credit card required.
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="company" className="type-label block text-muted">
                  Company name
                </label>
                <div className="relative mt-2">
                  <Building
                    className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                    aria-hidden
                  />
                  <input
                    id="company"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="TransAsia Logistics LLC"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="fleet" className="type-label block text-muted">
                  Fleet size
                </label>
                <select
                  id="fleet"
                  value={fleetSize}
                  onChange={(e) => setFleetSize(e.target.value)}
                  className="mt-2 h-12 w-full rounded-input border border-powder bg-white px-4 text-[15px] text-royal transition-colors focus:border-royal"
                >
                  <option>10 – 50 Vehicles</option>
                  <option>50 – 200 Vehicles</option>
                  <option>200 – 1,000 Vehicles</option>
                  <option>1,000+ Enterprise Fleet</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="fullname" className="type-label block text-muted">
                  Administrator full name
                </label>
                <div className="relative mt-2">
                  <User
                    className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                    aria-hidden
                  />
                  <input
                    id="fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alisher Davronov"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="type-label block text-muted">
                  Business phone
                </label>
                <div className="relative mt-2">
                  <Phone
                    className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                    aria-hidden
                  />
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="type-label block text-muted">
                Work corporate email
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
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="type-label block text-muted">
                Create master password
              </label>
              <div className="relative mt-2">
                <Lock
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                  aria-hidden
                />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters with numbers"
                  className={inputClass}
                />
              </div>
            </div>

            <label htmlFor="terms" className="flex cursor-pointer items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                required
                id="terms"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 size-4 rounded-full border-line accent-royal"
              />
              <span className="text-xs leading-relaxed text-muted">
                I agree to the Logistimus{" "}
                <Link href="/terms" className="text-royal underline">
                  Master Service Agreement
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-royal underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-royal px-6 text-[15px] font-medium text-ice transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating organization…" : "Create organization workspace"}
              {!loading && <ArrowRight className="size-4" />}
            </button>
          </form>

          <div className="mt-8 border-t border-line pt-6 text-center text-xs text-muted">
            Already registered?{" "}
            <Link href="/sign-in" className="font-medium text-royal hover:underline">
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ice" />}>
      <SignUpForm />
    </Suspense>
  );
}

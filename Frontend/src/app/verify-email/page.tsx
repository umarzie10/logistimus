"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, CheckCircle, RefreshCw, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [resendNotice, setResendNotice] = useState("");
  const [error, setError] = useState("");

  // Decrement cooldown timer each second
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleChange = (index: number, val: string) => {
    const digitOnly = val.replace(/\D/g, "");
    if (!digitOnly && val) return;

    const next = [...code];
    next[index] = digitOnly.slice(-1);
    setCode(next);

    // Auto focus next input
    if (digitOnly && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setCode(next);

    const focusIdx = Math.min(pasted.length, 5);
    document.getElementById(`digit-${focusIdx}`)?.focus();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const entered = code.join("");
    if (!email.trim()) {
      setError("Please provide your registered corporate email.");
      return;
    }
    if (entered.length < 6) {
      setError("Please enter the complete 6-digit confirmation code.");
      return;
    }
    setError("");
    setVerifying(true);

    try {
      await authApi.verifyEmail(email.trim().toLowerCase(), entered);
      setVerified(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === "code_expired") {
          setError("This verification code has expired. Please click 'Resend Code' below.");
        } else if (err.code === "rate_limited") {
          setError("Too many invalid attempts. For security, please request a fresh code.");
        } else {
          setError(err.message || "Invalid verification code. Please check your email.");
        }
      } else {
        setError("Network error while verifying email. Please check your connection and retry.");
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resending || cooldownSeconds > 0 || !email.trim()) return;
    setResending(true);
    setError("");

    try {
      const res = await authApi.resendVerification(email.trim().toLowerCase());
      const cd = res.cooldown_seconds || 60;
      setCooldownSeconds(cd);
      setResendNotice(
        `A fresh 6-digit code has been dispatched to ${email.trim()}.`
      );
      setTimeout(() => setResendNotice(""), 6000);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to resend code.");
      } else {
        setError("Failed to resend code. Please retry later.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-ice flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative">
      <div className="relative z-10 w-full max-w-md bg-white rounded-card border border-line p-8 sm:p-10 shadow-sm animate-hero-panel">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="relative w-8 h-8">
              <Image src="/logo-transparent.png" alt="Logistimus" fill className="object-contain" priority />
            </div>
            <span className="font-semibold text-xl tracking-tight text-midnight">Logistimus</span>
          </Link>
          <h1 className="text-2xl font-light text-midnight">Verify Your Email</h1>
          <p className="text-xs text-muted mt-2">
            We sent a 6-digit operational confirmation code to your corporate email.
          </p>
        </div>

        {verified ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-success text-midnight flex items-center justify-center mx-auto border border-success">
              <CheckCircle className="w-6 h-6 text-midnight" />
            </div>
            <h2 className="text-base font-medium text-midnight">Email Confirmed</h2>
            <p className="text-xs text-muted leading-relaxed">
              Your company account is fully authorized. You can now launch your logistics dashboard.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => router.push("/sign-in")}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-royal text-ice text-xs font-medium hover:bg-midnight transition-colors"
              >
                Sign In to Platform <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-5 text-xs">
            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-input bg-danger/15 border border-danger/30 text-midnight text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {resendNotice && (
              <div
                role="status"
                className="p-3.5 rounded-input bg-success/20 border border-success text-midnight text-xs flex items-start gap-2.5"
              >
                <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>{resendNotice}</span>
              </div>
            )}

            <div>
              <label htmlFor="verify-email" className="block text-xs font-semibold text-midnight uppercase tracking-wider mb-1.5">
                Work Corporate Email
              </label>
              <input
                id="verify-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="h-11 w-full px-3.5 rounded-input border border-powder bg-white text-sm text-royal placeholder:text-blue-500 focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal"
              />
            </div>

            <div>
              <label className="block font-medium text-midnight mb-2 text-center text-xs">
                6-Digit Confirmation Code
              </label>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`digit-${idx}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    aria-label={`Digit ${idx + 1}`}
                    className="w-10 h-12 text-center font-mono text-base font-semibold text-royal rounded-input border border-powder bg-white focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal transition-all"
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted text-center">
                Paste or type the 6 digits from your email.
              </p>
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-full bg-royal hover:bg-midnight text-ice font-medium text-xs transition-colors disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                "Confirm Authorization"
              )}
            </button>

            <div className="pt-3 border-t border-line flex items-center justify-between text-xs text-muted">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-500" /> Did not receive code?
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldownSeconds > 0}
                className="font-medium text-royal hover:underline inline-flex items-center gap-1 disabled:opacity-50 disabled:no-underline"
              >
                <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                {resending
                  ? "Dispatching..."
                  : cooldownSeconds > 0
                  ? `Resend in ${cooldownSeconds}s`
                  : "Resend Code"}
              </button>
            </div>

            <div className="text-center pt-2">
              <Link href="/sign-in" className="text-xs text-muted hover:text-royal hover:underline">
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ice flex items-center justify-center text-royal">Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}

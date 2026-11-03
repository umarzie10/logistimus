"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle, RefreshCw, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState("");
  const [error, setError] = useState("");

  const handleChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const next = [...code];
    next[index] = val;
    setCode(next);

    // Auto focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = () => {
    const entered = code.join("");
    if (entered.length < 6) {
      setError("Please enter the complete 6-digit confirmation code.");
      return;
    }
    setError("");
    setVerified(true);
  };

  const handleResend = () => {
    if (resending) return;
    setResending(true);
    setTimeout(() => {
      setResending(false);
      setResendNotice("A fresh verification code has been dispatched to your email.");
      setTimeout(() => setResendNotice(""), 4000);
    }, 600);
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
          <h1 className="text-2xl font-light text-[#061336]">Verify Your Email</h1>
          <p className="text-xs text-[#3F5C96] mt-2">
            We sent a 6-digit operational confirmation code to your work email.
          </p>
        </div>

        {verified ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-success/15 text-midnight flex items-center justify-center mx-auto border border-success/40">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <h2 className="text-base font-light text-[#061336]">Email Confirmed</h2>
            <p className="text-xs text-[#3F5C96] leading-relaxed">
              Your company account is fully authorized. You can now launch your logistics dashboard.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0E2F76] text-[#FFFFFF] text-xs font-medium hover:bg-[#061336] transition-colors"
              >
                Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 text-xs">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-input bg-danger/15 border border-danger/40 text-midnight font-medium"
              >
                {error}
              </div>
            )}

            {resendNotice && (
              <div
                role="status"
                className="p-3 rounded-input bg-success/15 border border-success/40 text-midnight font-medium"
              >
                {resendNotice}
              </div>
            )}

            <div>
              <label className="block font-medium text-[#061336] mb-2 text-center">
                6-Digit Authorization Code
              </label>
              <div className="flex justify-center gap-2">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`digit-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    className="w-10 h-12 text-center font-mono text-base font-semibold text-[#061336] rounded-input border border-[#CFDBEE] bg-[#ffffff] focus:outline-none focus:border-[#0E2F76]"
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleVerify}
              className="w-full py-2.5 px-4 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-[#FFFFFF] font-medium text-xs transition-colors"
            >
              Confirm Authorization
            </button>

            <div className="pt-3 border-t border-[#CFDBEE]/60 flex items-center justify-between text-xs text-[#3F5C96]">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Did not receive code?
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="font-medium text-[#0E2F76] hover:underline inline-flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                Resend Code
              </button>
            </div>

            <div className="text-center pt-2">
              <Link href="/sign-in" className="text-xs font-medium text-[#0E2F76] hover:underline">
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

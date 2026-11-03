"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F4FEFF] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md bg-[#FFFFFF] rounded-card border border-[#CFDBEE] p-8 sm:p-10 ">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="relative w-7 h-7">
              <Image src="/logo-transparent.png" alt="Logistimus" fill className="object-contain" />
            </div>
            <span className="text-xl font-semibold text-[#061336]">Logistimus</span>
          </Link>
          <h1 className="text-2xl font-light text-[#061336]">Reset Password</h1>
          <p className="text-xs text-[#3F5C96] mt-2">
            Enter your work email address to receive password recovery instructions.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-success/15 text-midnight flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-light text-[#061336]">Recovery Email Dispatched</h3>
            <p className="text-xs text-[#3F5C96] leading-relaxed">
              We have sent a one-time secure password reset link to <strong className="text-[#061336]">{email}</strong>.
            </p>
            <div className="pt-4">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 text-xs font-medium text-[#0E2F76] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-[#FFFFFF] font-medium text-sm transition-colors mt-2"
            >
              Send Recovery Link
            </button>

            <div className="text-center pt-4">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3F5C96] hover:text-[#061336]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

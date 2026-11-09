"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Building, Mail, Lock, Phone, User, AlertCircle } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

export default function SignUpPage() {
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-[#F4FEFF] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl bg-[#FFFFFF] rounded-card border border-[#CFDBEE] p-8 sm:p-12 ">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="relative w-8 h-8">
              <Image
                src="/logo-transparent.png"
                alt="Logistimus Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-[#061336]">
              Logistimus
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-light text-[#061336]">
            Register Your Logistics Organization
          </h1>
          <p className="text-sm text-[#3F5C96] mt-2">
            Start your 14-day enterprise workspace trial. No credit card required.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-3 rounded-input bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#061336] uppercase tracking-wider mb-2">
                Company Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-[#3F5C96] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. TransAsia Logistics LLC"
                  className="w-full pl-10 pr-3 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#061336] uppercase tracking-wider mb-2">
                Fleet Size
              </label>
              <select
                value={fleetSize}
                onChange={(e) => setFleetSize(e.target.value)}
                className="w-full px-3 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
              >
                <option>10 – 50 Vehicles</option>
                <option>50 – 200 Vehicles</option>
                <option>200 – 1,000 Vehicles</option>
                <option>1,000+ Enterprise Fleet</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#061336] uppercase tracking-wider mb-2">
                Administrator Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#3F5C96] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alisher Davronov"
                  className="w-full pl-10 pr-3 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#061336] uppercase tracking-wider mb-2">
                Business Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#3F5C96] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full pl-10 pr-3 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#061336] uppercase tracking-wider mb-2">
              Work Corporate Email
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

          <div>
            <label className="block text-xs font-semibold text-[#061336] uppercase tracking-wider mb-2">
              Create Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#3F5C96] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters with numbers"
                className="w-full pl-10 pr-3 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-2">
            <input
              type="checkbox"
              required
              id="terms"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 rounded-full border-[#CFDBEE] text-[#0E2F76] focus:ring-[#0E2F76]"
            />
            <label htmlFor="terms" className="text-xs text-[#3F5C96]">
              I agree to the Logistimus{" "}
              <Link href="/terms" className="text-[#0E2F76] underline">
                Master Service Agreement
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-[#0E2F76] underline">
                Privacy Policy
              </Link>
              .
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-[#FFFFFF] font-medium text-sm transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {loading ? "Creating organization workspace..." : "Create Organization Workspace"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#CFDBEE]/60 text-center text-xs text-[#3F5C96]">
          Already registered?{" "}
          <Link href="/sign-in" className="font-medium text-[#0E2F76] hover:underline">
            Sign In to your account
          </Link>
        </div>
      </div>
    </div>
  );
}

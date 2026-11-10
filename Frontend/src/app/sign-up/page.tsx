"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  Building,
  Mail,
  Lock,
  Phone,
  User,
  Globe,
  MapPin,
  Briefcase,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

const COMPANY_TYPES = [
  "Freight Forwarder",
  "Logistics Company",
  "Warehouse",
  "Distributor",
  "Manufacturer",
  "Other",
] as const;

const COUNTRIES = [
  { name: "United States", code: "US", dial: "+1" },
  { name: "United Kingdom", code: "GB", dial: "+44" },
  { name: "Uzbekistan", code: "UZ", dial: "+998" },
  { name: "Germany", code: "DE", dial: "+49" },
  { name: "Kazakhstan", code: "KZ", dial: "+7" },
  { name: "Turkey", code: "TR", dial: "+90" },
  { name: "United Arab Emirates", code: "AE", dial: "+971" },
  { name: "Canada", code: "CA", dial: "+1" },
  { name: "China", code: "CN", dial: "+86" },
  { name: "France", code: "FR", dial: "+33" },
  { name: "Poland", code: "PL", dial: "+48" },
  { name: "Lithuania", code: "LT", dial: "+370" },
  { name: "Netherlands", code: "NL", dial: "+31" },
  { name: "Singapore", code: "SG", dial: "+65" },
  { name: "India", code: "IN", dial: "+91" },
  { name: "Other International", code: "OTHER", dial: "+" },
] as const;

function calculatePasswordStrength(pass: string): {
  score: number;
  label: "Too short" | "Weak" | "Good" | "Strong";
  colorClass: string;
} {
  if (!pass) return { score: 0, label: "Too short", colorClass: "bg-line" };
  if (pass.length < 8) return { score: 1, label: "Too short", colorClass: "bg-danger" };

  let score = 1;
  const hasNumber = /\d/.test(pass);
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);

  if (hasNumber) score += 1;
  if ((hasUpper && hasLower) || hasSpecial) score += 1;
  if (pass.length >= 12 && hasNumber && hasSpecial) score += 1;

  if (score <= 1) return { score: 1, label: "Weak", colorClass: "bg-danger" };
  if (score === 2) return { score: 2, label: "Good", colorClass: "bg-warning" };
  return { score: 3, label: "Strong", colorClass: "bg-success" };
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") || "starter";

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Step 1: Account
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Company
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState<string>(COMPANY_TYPES[1]);
  const [country, setCountry] = useState<string>("United States");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [terms, setTerms] = useState(false);

  // Field-level error messages
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};

    if (!firstName.trim()) {
      errs.firstName = "First name is required.";
    } else if (firstName.trim().length < 2) {
      errs.firstName = "First name must be at least 2 characters.";
    }

    if (!lastName.trim()) {
      errs.lastName = "Last name is required.";
    } else if (lastName.trim().length < 2) {
      errs.lastName = "Last name must be at least 2 characters.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errs.email = "Corporate work email is required.";
    } else if (!emailRegex.test(email.trim())) {
      errs.email = "Please enter a valid business email address.";
    }

    if (!password) {
      errs.password = "Password is required.";
    } else if (password.length < 8) {
      errs.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      errs.confirmPassword = "Confirm password is required.";
    } else if (confirmPassword !== password) {
      errs.confirmPassword = "Passwords do not match.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};

    if (!companyName.trim()) {
      errs.companyName = "Company name is required.";
    } else if (companyName.trim().length < 2) {
      errs.companyName = "Company name must be at least 2 characters.";
    }

    if (!country.trim()) {
      errs.country = "Country is required.";
    }

    if (!companyType) {
      errs.companyType = "Company type is required.";
    }

    const phoneDigits = phone.replace(/[^\d]/g, "");
    if (!phone.trim()) {
      errs.phone = "Business phone number with country code is required.";
    } else if (phoneDigits.length < 7 || phone.trim().length > 32) {
      errs.phone = "Enter a valid international phone number (e.g. +1 555 123 4567).";
    }

    if (website.trim() && website.trim().length > 255) {
      errs.website = "Website URL cannot exceed 255 characters.";
    }

    if (!terms) {
      errs.terms = "You must accept the Master Service Agreement and Privacy Policy.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinueToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Mark all Step 1 fields as touched on submit attempt
    setTouched((prev) => ({
      ...prev,
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
    }));

    const isValid = validateStep1();
    if (isValid) {
      setStep(2);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Mark all Step 2 fields as touched on submit attempt
    setTouched((prev) => ({
      ...prev,
      companyName: true,
      companyType: true,
      country: true,
      phone: true,
      terms: true,
    }));

    // Validate step 1 in case user manipulated state
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    if (!validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      await authApi.register({
        companyName: companyName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        country: country.trim(),
        companyType: companyType.trim(),
        website: website.trim() || undefined,
        acceptTerms: true,
        tier: tier,
      });

      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === "email_exists") {
          setGeneralError("An account with this email already exists. Please sign in instead.");
          setErrors((prev) => ({
            ...prev,
            email: "An account with this email already exists.",
          }));
        } else if (err.code === "password_mismatch") {
          setGeneralError("Passwords do not match. Please re-enter your password.");
          setStep(1);
          setErrors((prev) => ({
            ...prev,
            confirmPassword: "Passwords do not match.",
          }));
        } else {
          setGeneralError(err.message || "Failed to register organization.");
        }
      } else {
        setGeneralError("Unable to reach backend service. Please check your network connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = calculatePasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password;
  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== password;

  const inputClass = (field: string, hasIconLeft = true) =>
    `h-12 w-full rounded-input border bg-white ${
      hasIconLeft ? "pl-11" : "pl-4"
    } pr-4 text-[15px] text-royal transition-all placeholder:text-blue-500 focus:outline-none focus:ring-1 ${
      errors[field] && touched[field]
        ? "border-danger focus:border-danger focus:ring-danger"
        : "border-powder focus:border-royal focus:ring-royal"
    }`;

  return (
    <div className="sky min-h-screen flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      {/* Thin Royal rail lines (DESIGN.md §6.3) */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[9%] w-px bg-royal/20" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-[9%] w-px bg-royal/20" />

      <div className="relative z-10 w-full max-w-[1140px] grid lg:grid-cols-[380px_1fr] rounded-card overflow-hidden border border-line bg-white animate-hero-panel shadow-sm">
        {/* Left — Brand Panel */}
        <div className="relative hidden lg:flex flex-col bg-royal text-ice overflow-hidden p-10 xl:p-11">
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
              14-Day Enterprise Trial
            </span>

            <h2 className="mt-6 text-[clamp(28px,2.2vw,36px)] font-light leading-[1.12] tracking-display text-ice">
              Launch your logistics command center.
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-powder">
              Start on the <span className="font-medium text-white capitalize">{tier}</span> tier.
              Full platform access with no credit card required.
            </p>

            <div className="relative mt-6 flex-1 min-h-[140px] max-h-[220px]">
              <Image
                src="/images/truck-brand-transparent.webp"
                alt="Logistimus fleet transportation semi-truck"
                fill
                className="object-contain scale-105"
                priority
              />
            </div>

            {/* Stacked pills — signature motif (DESIGN.md §6.1) */}
            <div className="mt-6 grid gap-3">
              <div className="rounded-card bg-ice px-5 py-3.5 text-center text-royal transition-all">
                <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
                  Current Step
                </div>
                <div className="mt-0.5 text-sm font-semibold capitalize">
                  {step === 1 ? "1. Admin Account Details" : "2. Organization Setup"}
                </div>
              </div>
              <div className="rounded-card bg-powder px-5 py-3 text-center text-royal">
                <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-royal/80">
                  Included Trial
                </div>
                <div className="mt-0.5 text-xs opacity-90">14 Days · Zero Commitment</div>
              </div>
              <div className="rounded-card border border-white/25 bg-royal/80 px-5 py-3 text-center text-ice">
                <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-powder">
                  Verification Next
                </div>
                <div className="mt-0.5 text-xs opacity-90">Instant 6-digit email confirmation</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Form Container */}
        <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            {/* Header / Logo */}
            <div className="flex items-center justify-between">
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
              <div className="text-xs text-muted">
                Step <span className="font-semibold text-royal">{step}</span> of 2
              </div>
            </div>

            {/* Step Progress Indicators */}
            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step === 1 ? "bg-royal" : "bg-success"
                }`}
                aria-label="Go to Step 1: Account Information"
              />
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step === 2 ? "bg-royal" : "bg-line hover:bg-powder/60"
                }`}
                aria-label="Go to Step 2: Company Details"
              />
            </div>

            {/* Form Title & Subtitle */}
            <div className="mt-5">
              <h1 className="type-heading text-midnight text-2xl sm:text-[26px]">
                {step === 1 ? "Create your administrator account" : "Set up your organization"}
              </h1>
              <p className="mt-1.5 text-sm text-muted">
                {step === 1
                  ? "Enter your corporate credentials to establish initial account ownership."
                  : "Tell us about your logistics entity to personalize your workspace."}
              </p>
            </div>

            {/* General Error Banner */}
            {generalError && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-input bg-danger/15 border border-danger/30 p-3.5 text-xs text-midnight"
              >
                <AlertCircle className="size-4 shrink-0 text-danger mt-0.5" aria-hidden />
                <div className="flex-1">
                  <span className="font-medium">{generalError}</span>
                  {generalError.includes("sign in") && (
                    <div className="mt-1">
                      <Link href="/sign-in" className="text-royal font-semibold underline">
                        Click here to sign in
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= STEP 1: ACCOUNT DETAILS ================= */}
            {step === 1 && (
              <form onSubmit={handleContinueToStep2} noValidate className="mt-6 space-y-4 sm:space-y-4.5">
                {/* First Name & Last Name */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="type-label block text-muted text-xs">
                      First Name <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <User
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                        aria-hidden
                      />
                      <input
                        id="firstName"
                        type="text"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          clearFieldError("firstName");
                        }}
                        onBlur={() => markTouched("firstName")}
                        placeholder="Alisher"
                        aria-invalid={!!(errors.firstName && touched.firstName)}
                        aria-describedby={errors.firstName ? "firstName-error" : undefined}
                        className={inputClass("firstName")}
                      />
                    </div>
                    {errors.firstName && touched.firstName && (
                      <p id="firstName-error" className="mt-1 text-xs text-danger flex items-center gap-1">
                        <AlertCircle className="size-3 shrink-0" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="type-label block text-muted text-xs">
                      Last Name <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <User
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                        aria-hidden
                      />
                      <input
                        id="lastName"
                        type="text"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          clearFieldError("lastName");
                        }}
                        onBlur={() => markTouched("lastName")}
                        placeholder="Davronov"
                        aria-invalid={!!(errors.lastName && touched.lastName)}
                        aria-describedby={errors.lastName ? "lastName-error" : undefined}
                        className={inputClass("lastName")}
                      />
                    </div>
                    {errors.lastName && touched.lastName && (
                      <p id="lastName-error" className="mt-1 text-xs text-danger flex items-center gap-1">
                        <AlertCircle className="size-3 shrink-0" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Work Email */}
                <div>
                  <label htmlFor="email" className="type-label block text-muted text-xs">
                    Work Email Address <span className="text-danger">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                      aria-hidden
                    />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError("email");
                      }}
                      onBlur={() => markTouched("email")}
                      placeholder="alisher@company.com"
                      aria-invalid={!!(errors.email && touched.email)}
                      aria-describedby={errors.email ? "email-error" : undefined}
                      className={inputClass("email")}
                    />
                  </div>
                  {errors.email && touched.email && (
                    <p id="email-error" className="mt-1 text-xs text-danger flex items-center gap-1">
                      <AlertCircle className="size-3 shrink-0" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className="type-label block text-muted text-xs">
                      Master Password <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <Lock
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                        aria-hidden
                      />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearFieldError("password");
                        }}
                        onBlur={() => markTouched("password")}
                        placeholder="Min. 8 characters"
                        aria-invalid={!!(errors.password && touched.password)}
                        aria-describedby="password-rules"
                        className={`${inputClass("password")} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 hover:text-royal transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {password.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              strength.score >= 1 ? strength.colorClass : "bg-line"
                            }`}
                          />
                          <div
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              strength.score >= 2 ? strength.colorClass : "bg-line"
                            }`}
                          />
                          <div
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              strength.score >= 3 ? strength.colorClass : "bg-line"
                            }`}
                          />
                          <span className="ml-1 text-[11px] font-medium text-muted">
                            {strength.label}
                          </span>
                        </div>
                      </div>
                    )}

                    {errors.password && touched.password && (
                      <p className="mt-1 text-xs text-danger flex items-center gap-1">
                        <AlertCircle className="size-3 shrink-0" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="type-label block text-muted text-xs">
                      Confirm Password <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <Lock
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                        aria-hidden
                      />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          clearFieldError("confirmPassword");
                        }}
                        onBlur={() => markTouched("confirmPassword")}
                        placeholder="Re-enter password"
                        aria-invalid={!!(errors.confirmPassword && touched.confirmPassword)}
                        className={`${inputClass("confirmPassword")} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 hover:text-royal transition-colors"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>

                    {/* Matching status */}
                    {passwordsMatch && (
                      <p className="mt-1.5 text-xs text-success flex items-center gap-1">
                        <Check className="size-3.5" />
                        Passwords match
                      </p>
                    )}
                    {passwordsMismatch && (
                      <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                        <AlertCircle className="size-3.5" />
                        Passwords do not match
                      </p>
                    )}
                    {errors.confirmPassword && touched.confirmPassword && !passwordsMismatch && (
                      <p className="mt-1 text-xs text-danger flex items-center gap-1">
                        <AlertCircle className="size-3 shrink-0" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                {/* Password guidelines info note */}
                <div id="password-rules" className="rounded-input bg-ice/70 border border-line p-3 text-xs text-muted flex items-start gap-2">
                  <ShieldCheck className="size-4 text-royal shrink-0 mt-0.5" />
                  <span>
                    Must be at least 8 characters. We recommend combining letters, numbers, and symbols for enterprise protection.
                  </span>
                </div>

                {/* Continue button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-royal px-6 text-[15px] font-medium text-ice transition-all hover:bg-midnight active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-royal/30"
                  >
                    Continue to Company Details
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </form>
            )}

            {/* ================= STEP 2: COMPANY DETAILS ================= */}
            {step === 2 && (
              <form onSubmit={handleFinalSubmit} noValidate className="mt-6 space-y-4 sm:space-y-4.5">
                {/* Company Name */}
                <div>
                  <label htmlFor="companyName" className="type-label block text-muted text-xs">
                    Company Name <span className="text-danger">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Building
                      className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                      aria-hidden
                    />
                    <input
                      id="companyName"
                      type="text"
                      autoComplete="organization"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        clearFieldError("companyName");
                      }}
                      onBlur={() => markTouched("companyName")}
                      placeholder="TransAsia Global Logistics LLC"
                      aria-invalid={!!(errors.companyName && touched.companyName)}
                      aria-describedby={errors.companyName ? "companyName-error" : undefined}
                      className={inputClass("companyName")}
                    />
                  </div>
                  {errors.companyName && touched.companyName && (
                    <p id="companyName-error" className="mt-1 text-xs text-danger flex items-center gap-1">
                      <AlertCircle className="size-3 shrink-0" />
                      {errors.companyName}
                    </p>
                  )}
                </div>

                {/* Company Type & Country */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="companyType" className="type-label block text-muted text-xs">
                      Company Type <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <Briefcase
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                        aria-hidden
                      />
                      <select
                        id="companyType"
                        value={companyType}
                        onChange={(e) => {
                          setCompanyType(e.target.value);
                          clearFieldError("companyType");
                        }}
                        className={`${inputClass("companyType")} cursor-pointer`}
                      >
                        {COMPANY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.companyType && (
                      <p className="mt-1 text-xs text-danger flex items-center gap-1">
                        <AlertCircle className="size-3 shrink-0" />
                        {errors.companyType}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="country" className="type-label block text-muted text-xs">
                      Country of Operation <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <MapPin
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                        aria-hidden
                      />
                      <select
                        id="country"
                        value={country}
                        onChange={(e) => {
                          setCountry(e.target.value);
                          clearFieldError("country");
                        }}
                        className={`${inputClass("country")} cursor-pointer`}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.name}>
                            {c.name} ({c.dial})
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.country && (
                      <p className="mt-1 text-xs text-danger flex items-center gap-1">
                        <AlertCircle className="size-3 shrink-0" />
                        {errors.country}
                      </p>
                    )}
                  </div>
                </div>

                {/* Business Phone & Website */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phone" className="type-label block text-muted text-xs">
                      Business Phone <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <Phone
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                        aria-hidden
                      />
                      <input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          clearFieldError("phone");
                        }}
                        onBlur={() => markTouched("phone")}
                        placeholder="+1 555 123 4567"
                        aria-invalid={!!(errors.phone && touched.phone)}
                        aria-describedby={errors.phone ? "phone-error" : undefined}
                        className={inputClass("phone")}
                      />
                    </div>
                    {errors.phone && touched.phone && (
                      <p id="phone-error" className="mt-1 text-xs text-danger flex items-center gap-1">
                        <AlertCircle className="size-3 shrink-0" />
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="website" className="type-label block text-muted text-xs">
                      Company Website <span className="text-muted/60 text-[11px]">(Optional)</span>
                    </label>
                    <div className="relative mt-1.5">
                      <Globe
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-blue-500"
                        aria-hidden
                      />
                      <input
                        id="website"
                        type="url"
                        autoComplete="url"
                        value={website}
                        onChange={(e) => {
                          setWebsite(e.target.value);
                          clearFieldError("website");
                        }}
                        placeholder="https://company.com"
                        className={inputClass("website")}
                      />
                    </div>
                  </div>
                </div>

                {/* Terms Acceptance */}
                <div className="pt-1">
                  <label htmlFor="terms" className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={terms}
                      onChange={(e) => {
                        setTerms(e.target.checked);
                        clearFieldError("terms");
                      }}
                      className="mt-0.5 size-4 rounded-full border-line accent-royal cursor-pointer"
                    />
                    <span className="text-xs leading-relaxed text-muted">
                      I accept the Logistimus{" "}
                      <Link href="/terms" target="_blank" className="text-royal font-medium underline hover:text-midnight">
                        Master Service Agreement
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" target="_blank" className="text-royal font-medium underline hover:text-midnight">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="mt-1 text-xs text-danger flex items-center gap-1">
                      <AlertCircle className="size-3 shrink-0" />
                      {errors.terms}
                    </p>
                  )}
                </div>

                {/* Button Controls */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setGeneralError(null);
                    }}
                    className="flex min-h-12 w-full sm:w-auto items-center justify-center gap-1.5 rounded-full border border-line bg-white px-5 text-sm font-medium text-royal hover:bg-ice transition-colors"
                  >
                    <ArrowLeft className="size-4" />
                    Back to Account
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex min-h-12 flex-1 w-full items-center justify-center gap-2 rounded-full bg-royal px-6 text-[15px] font-medium text-ice transition-all hover:bg-midnight active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-royal/30"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Creating Workspace…</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Registration</span>
                        <CheckCircle2 className="size-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bottom Login Link */}
          <div className="mt-8 border-t border-line pt-5 text-center text-xs text-muted">
            Already have an active account?{" "}
            <Link href="/sign-in" className="font-semibold text-royal hover:text-midnight hover:underline">
              Sign in to your platform
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ice flex items-center justify-center text-royal">Loading...</div>}>
      <SignUpForm />
    </Suspense>
  );
}

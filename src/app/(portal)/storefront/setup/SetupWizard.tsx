"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Check,
  X,
  ImageIcon,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface RoasterData {
  id: string;
  business_name: string;
  email: string;
  storefront_slug: string;
  storefront_type: string;
  brand_logo_url: string;
  brand_primary_colour: string;
  brand_accent_colour: string;
  brand_heading_font: string;
  brand_tagline: string;
  brand_hero_image_url: string;
  brand_about: string;
  brand_instagram: string;
  brand_facebook: string;
  brand_tiktok: string;
  stripe_account_id: string;
}

const TOTAL_STEPS = 6;

const inputClassName =
  "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export function SetupWizard({ roaster }: { roaster: RoasterData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Slug
  const [slug, setSlug] = useState(
    roaster.storefront_slug || slugify(roaster.business_name)
  );
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const slugTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Step 2 — Type
  const [storefrontType, setStorefrontType] = useState(roaster.storefront_type || "wholesale");

  // Step 3 — Branding
  const [logoUrl, setLogoUrl] = useState(roaster.brand_logo_url);
  const [primaryColour, setPrimaryColour] = useState(roaster.brand_primary_colour);
  const [accentColour, setAccentColour] = useState(roaster.brand_accent_colour);
  const [font, setFont] = useState(roaster.brand_heading_font);
  const [heroImageUrl, setHeroImageUrl] = useState(roaster.brand_hero_image_url);
  const [tagline, setTagline] = useState(roaster.brand_tagline);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Step 4 — About
  const [about, setAbout] = useState(roaster.brand_about);
  const [instagram, setInstagram] = useState(roaster.brand_instagram);
  const [facebook, setFacebook] = useState(roaster.brand_facebook);
  const [tiktok, setTiktok] = useState(roaster.brand_tiktok);

  // Step 5 — Stripe
  const [stripeConnected, setStripeConnected] = useState(!!roaster.stripe_account_id);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    onboarding_complete: boolean;
    charges_enabled: boolean;
  } | null>(null);

  // Step 6 — Go Live
  const [goLive, setGoLive] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check Stripe status on return from Stripe
  const checkStripeStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/storefront/stripe/status");
      const data = await res.json();
      setStripeStatus(data);
      setStripeConnected(data.connected);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    if (stripeParam === "complete" || stripeParam === "refresh") {
      setStep(5);
      checkStripeStatus();
    }
  }, [searchParams, checkStripeStatus]);

  // Slug availability check with debounce
  useEffect(() => {
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);

    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    slugTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/storefront/check-slug?slug=${encodeURIComponent(slug)}`
        );
        const data = await res.json();
        setSlugAvailable(data.available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    };
  }, [slug]);

  // Check stripe status on mount if account exists
  useEffect(() => {
    if (roaster.stripe_account_id) {
      checkStripeStatus();
    }
  }, [roaster.stripe_account_id, checkStripeStatus]);

  async function handleUpload(
    file: File,
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void
  ) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setUrl(data.url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function saveStep() {
    setSaving(true);
    setError(null);

    let stepData: Record<string, unknown> = {};

    switch (step) {
      case 1:
        stepData = { storefront_slug: slug };
        break;
      case 2:
        stepData = { storefront_type: storefrontType };
        break;
      case 3:
        stepData = {
          brand_logo_url: logoUrl || null,
          brand_primary_colour: primaryColour,
          brand_accent_colour: accentColour,
          brand_heading_font: font,
          brand_hero_image_url: heroImageUrl || null,
          brand_tagline: tagline || null,
        };
        break;
      case 4:
        stepData = {
          brand_about: about || null,
          brand_instagram: instagram || null,
          brand_facebook: facebook || null,
          brand_tiktok: tiktok || null,
        };
        break;
      case 6:
        stepData = { storefront_enabled: goLive };
        break;
      default:
        setSaving(false);
        return true;
    }

    try {
      const res = await fetch("/api/storefront/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, data: stepData }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        setSaving(false);
        return false;
      }

      setSaving(false);
      return true;
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
      return false;
    }
  }

  async function handleNext() {
    if (step === 1 && !slugAvailable) {
      setError("Please choose an available subdomain");
      return;
    }

    // Step 5 (Stripe) doesn't save to our setup endpoint
    if (step !== 5) {
      const success = await saveStep();
      if (!success) return;
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      setError(null);
    }
  }

  async function handleLaunch() {
    const success = await saveStep();
    if (!success) return;

    router.push("/storefront/branding");
    router.refresh();
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  }

  async function handleStripeConnect() {
    setStripeLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/storefront/stripe/connect", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect Stripe");
        setStripeLoading(false);
        return;
      }
      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch {
      setError("Failed to connect Stripe. Please try again.");
      setStripeLoading(false);
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(`${slug}.ghostroastery.com`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const progressPercent = (step / TOTAL_STEPS) * 100;

  return (
    <div className="max-w-2xl">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span>{Math.round(progressPercent)}% complete</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {/* Step 1: Choose subdomain */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Choose your subdomain
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              This will be your storefront URL. Choose carefully — this cannot be
              changed after going live.
            </p>

            <div className="flex items-center gap-0">
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  const val = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "");
                  setSlug(val);
                }}
                placeholder="your-roastery"
                maxLength={30}
                className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-l-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <span className="px-4 py-2.5 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-sm text-slate-500 whitespace-nowrap">
                .ghostroastery.com
              </span>
            </div>

            {/* Availability indicator */}
            <div className="mt-2 h-5">
              {checkingSlug && (
                <span className="text-sm text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Checking…
                </span>
              )}
              {!checkingSlug && slugAvailable === true && slug.length >= 3 && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Available
                </span>
              )}
              {!checkingSlug && slugAvailable === false && slug.length >= 3 && (
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" />
                  Not available
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-2">
              3–30 characters. Lowercase letters, numbers, and hyphens only.
            </p>
          </div>
        )}

        {/* Step 2: Storefront type */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Storefront type
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Who do you sell to? You can change this later.
            </p>

            <div className="space-y-3">
              {[
                {
                  value: "wholesale",
                  label: "Wholesale only",
                  desc: "Sell to cafés, restaurants, and retailers",
                },
                {
                  value: "retail",
                  label: "Retail only",
                  desc: "Sell directly to individual consumers",
                },
                {
                  value: "both",
                  label: "Both wholesale and retail",
                  desc: "Serve both B2B and B2C customers",
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    storefrontType === option.value
                      ? "border-brand-600 bg-brand-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="storefrontType"
                    value={option.value}
                    checked={storefrontType === option.value}
                    onChange={(e) => setStorefrontType(e.target.value)}
                    className="mt-0.5 accent-brand-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {option.label}
                    </div>
                    <div className="text-sm text-slate-500">{option.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Branding */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Brand your storefront
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Customise the look and feel. You can update these anytime.
            </p>

            <div className="space-y-5">
              {/* Logo upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Logo
                </label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, setLogoUrl, setUploadingLogo);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                {logoUrl ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="text-sm text-slate-400 hover:text-slate-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="w-full border-2 border-dashed border-slate-300 rounded-lg py-6 flex flex-col items-center gap-1.5 text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors disabled:opacity-50"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6" />
                    )}
                    <span className="text-sm font-medium">
                      {uploadingLogo ? "Uploading…" : "Upload logo"}
                    </span>
                  </button>
                )}
              </div>

              {/* Colours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Primary colour
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColour}
                      onChange={(e) => setPrimaryColour(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={primaryColour}
                      onChange={(e) => setPrimaryColour(e.target.value)}
                      placeholder="#1A1A1A"
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Accent colour
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColour}
                      onChange={(e) => setAccentColour(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={accentColour}
                      onChange={(e) => setAccentColour(e.target.value)}
                      placeholder="#D97706"
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>

              {/* Font choice */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Font
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "inter", label: "Inter", style: "font-sans" },
                    { value: "figtree", label: "Figtree", style: "font-sans" },
                    {
                      value: "playfair",
                      label: "Playfair Display",
                      style: "font-serif",
                    },
                  ].map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFont(f.value)}
                      className={`p-3 rounded-lg border-2 text-center transition-colors ${
                        font === f.value
                          ? "border-brand-600 bg-brand-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className={`text-lg ${f.style}`}>Aa</span>
                      <p className="text-xs text-slate-500 mt-1">{f.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hero image */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Hero image{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  ref={heroInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, setHeroImageUrl, setUploadingHero);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                {heroImageUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImageUrl}
                      alt="Hero"
                      className="w-full h-40 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => heroInputRef.current?.click()}
                        className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroImageUrl("")}
                        className="text-sm text-slate-400 hover:text-slate-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => heroInputRef.current?.click()}
                    disabled={uploadingHero}
                    className="w-full border-2 border-dashed border-slate-300 rounded-lg py-6 flex flex-col items-center gap-1.5 text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors disabled:opacity-50"
                  >
                    {uploadingHero ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6" />
                    )}
                    <span className="text-sm font-medium">
                      {uploadingHero ? "Uploading…" : "Upload hero image"}
                    </span>
                  </button>
                )}
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tagline{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Specialty coffee, roasted fresh daily"
                  className={inputClassName}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: About */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Tell your story
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Help customers learn about your roastery.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  About your roastery{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Share your story — how you started, what makes your coffee special…"
                  rows={5}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Instagram{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@yourroastery"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Facebook{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="https://facebook.com/yourroastery"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  TikTok{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="@yourroastery"
                  className={inputClassName}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Connect Stripe */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Connect payments
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Connect your Stripe account to accept payments through your
              storefront. Funds go directly to you — Ghost Roastery takes a small
              platform fee.
            </p>

            {stripeStatus?.onboarding_complete ? (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Stripe connected
                  </p>
                  <p className="text-sm text-green-700 mt-0.5">
                    Your account is ready to accept payments.
                  </p>
                </div>
              </div>
            ) : stripeConnected && !stripeStatus?.onboarding_complete ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Onboarding incomplete
                    </p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      Your Stripe account was created but onboarding isn&apos;t
                      finished. Please complete it to accept payments.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleStripeConnect}
                  disabled={stripeLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#635BFF] text-white rounded-lg font-medium hover:bg-[#5851DB] transition-colors disabled:opacity-50"
                >
                  {stripeLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Complete Stripe onboarding
                </button>
              </div>
            ) : (
              <button
                onClick={handleStripeConnect}
                disabled={stripeLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#635BFF] text-white rounded-lg font-medium hover:bg-[#5851DB] transition-colors disabled:opacity-50"
              >
                {stripeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Connect with Stripe
              </button>
            )}
          </div>
        )}

        {/* Step 6: Go Live */}
        {step === 6 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Launch your storefront
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Review your setup and go live when you&apos;re ready.
            </p>

            {/* Summary */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Subdomain</span>
                <span className="text-sm font-medium text-slate-900">
                  {slug}.ghostroastery.com
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Type</span>
                <span className="text-sm font-medium text-slate-900 capitalize">
                  {storefrontType === "both"
                    ? "Wholesale & Retail"
                    : storefrontType}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Font</span>
                <span className="text-sm font-medium text-slate-900 capitalize">
                  {font === "playfair" ? "Playfair Display" : font}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Colours</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full border border-slate-200"
                    style={{ backgroundColor: primaryColour }}
                  />
                  <div
                    className="w-5 h-5 rounded-full border border-slate-200"
                    style={{ backgroundColor: accentColour }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Stripe</span>
                <span
                  className={`text-sm font-medium ${
                    stripeStatus?.onboarding_complete
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                >
                  {stripeStatus?.onboarding_complete
                    ? "Connected"
                    : "Not connected"}
                </span>
              </div>
            </div>

            {/* Storefront URL */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-slate-500 mb-1">Your storefront URL</p>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-slate-900">
                  {slug}.ghostroastery.com
                </p>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Copy URL"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Go live toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGoLive(!goLive)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  goLive ? "bg-brand-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                    goLive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-slate-700">
                {goLive
                  ? "Storefront is live"
                  : "Storefront is off — enable when ready"}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-200">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 text-slate-600 rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 5 && (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 text-slate-500 rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Skip — I&apos;ll do this later
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={saving || (step === 1 && (!slugAvailable || slug.length < 3))}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunch}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Launch Storefront
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

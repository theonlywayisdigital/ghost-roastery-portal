"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { OnboardingResponse } from "@/lib/onboarding";

interface WelcomeModalProps {
  onGetStarted: () => void;
}

export function WelcomeModal({ onGetStarted }: WelcomeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/onboarding");
        if (!res.ok) return;
        const data: OnboardingResponse = await res.json();
        if (!cancelled && !data.welcome_seen && !data.dismissed) {
          setVisible(true);
        }
      } catch {
        // silent
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  async function handleGetStarted() {
    setSubmitting(true);
    try {
      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ welcome_seen: true }),
      });
    } catch {
      // silent — still close and open the panel
    }
    setVisible(false);
    onGetStarted();
  }

  if (!mounted || !visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8 sm:p-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://zaryzynzbpxmscggufdc.supabase.co/storage/v1/object/public/assets/logo-main.png"
          alt="Roastery Platform"
          className="h-10 mx-auto mb-6"
        />
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
          Welcome to The Roastery Platform
        </h1>
        <p className="text-slate-600 text-base sm:text-lg mb-8">
          Use our Setup Guide to help get you familiarised and set up with The
          Roastery Platform.
        </p>
        <button
          onClick={handleGetStarted}
          disabled={submitting}
          className="inline-flex items-center justify-center px-8 py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {submitting ? "Loading..." : "Get Started"}
        </button>
      </div>
    </div>,
    document.body
  );
}

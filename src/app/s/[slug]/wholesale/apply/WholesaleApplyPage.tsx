"use client";

import Link from "next/link";
import { WholesaleApplyForm } from "@/app/s/[slug]/WholesaleApplyForm";
import { isLightColour } from "../../_components/utils";

const LOGO_SIZE_MAP = { small: 80, medium: 120, large: 160 };

export function WholesaleApplyPage({
  slug,
  roaster,
}: {
  slug: string;
  roaster: {
    id: string;
    businessName: string;
    logoUrl: string | null;
    primaryColour: string;
    accentColour: string;
    logoSize: "small" | "medium" | "large";
  };
}) {
  const accentText = isLightColour(roaster.accentColour) ? "#1e293b" : "#ffffff";
  const logoHeight = LOGO_SIZE_MAP[roaster.logoSize];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Branded header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-4">
          <div className="text-center mb-6">
            {roaster.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={roaster.logoUrl}
                alt={roaster.businessName}
                className="w-auto mx-auto"
                style={{ height: logoHeight }}
              />
            )}
            <h1 className="text-xl font-bold text-slate-900 mt-4">
              {`${roaster.businessName} Wholesale Applications`}
            </h1>
          </div>

          <WholesaleApplyForm
            roasterId={roaster.id}
            slug={slug}
            accentColour={roaster.accentColour}
            accentText={accentText}
          />

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href={`/s/${slug}/wholesale/login`}
                className="font-medium hover:underline"
                style={{ color: roaster.accentColour }}
              >
                Sign in
              </Link>
            </p>
          </div>

          <hr className="my-6 border-slate-200" />

          <p className="text-center text-xs text-slate-400">
            Powered by Roastery Platform
          </p>
        </div>
      </div>
    </div>
  );
}

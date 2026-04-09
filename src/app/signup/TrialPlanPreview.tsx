"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Check, X } from "@/components/icons";
import {
  getSalesLimits,
  getSalesFeatures,
  getSalesPricing,
  formatLimit,
  LIMIT_LABELS,
  FEATURE_LABELS,
  type SalesLimitKey,
  type SalesFeatureKey,
} from "@/lib/tier-config";

const LIMIT_KEYS: SalesLimitKey[] = [
  "products",
  "wholesaleOrdersPerMonth",
  "wholesaleAccounts",
  "crmContacts",
  "teamMembers",
];

const FEATURE_DISPLAY: { key: SalesFeatureKey; proOnly?: boolean }[] = [
  { key: "invoices" },
  { key: "pipeline" },
  { key: "orderExtraction" },
  { key: "integrationsEcommerce", proOnly: true },
  { key: "integrationsAccounting", proOnly: true },
];

export function TrialPlanPreview() {
  const [expanded, setExpanded] = useState(false);

  const limits = getSalesLimits("growth");
  const features = getSalesFeatures("growth");
  const pricing = getSalesPricing("growth");
  const price = pricing.monthly;

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4 text-left transition-colors hover:border-slate-300"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-700">
            <span className="font-medium">Your free trial includes:</span>{" "}
            Sales Growth — £{(price / 100).toFixed(0)}/mo after 14 days
          </p>
          <div className="flex items-center gap-1.5 text-sm text-slate-500 ml-4 flex-shrink-0">
            <span className="hidden sm:inline">
              {expanded ? "Hide details" : "See what\u2019s included"}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-0 bg-white rounded-b-xl border border-t-0 border-slate-200 shadow-sm px-6 pb-5">
          {/* Limits */}
          <div className="space-y-2 pt-2">
            {LIMIT_KEYS.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-600">{LIMIT_LABELS[key]}</span>
                <span className="font-medium text-slate-900">
                  {formatLimit(limits[key])}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-3" />

          {/* Features */}
          <div className="space-y-1.5">
            {FEATURE_DISPLAY.map(({ key, proOnly }) => {
              const enabled = features[key];
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {enabled ? (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  )}
                  <span
                    className={enabled ? "text-slate-700" : "text-slate-400"}
                  >
                    {FEATURE_LABELS[key]}
                    {!enabled && proOnly && (
                      <span className="text-slate-400"> (Pro)</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

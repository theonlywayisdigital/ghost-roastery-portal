"use client";

import { MapPin } from "@/components/icons";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DeliveryAddressCardProps {
  address: any;
}

export function DeliveryAddressCard({ address }: DeliveryAddressCardProps) {
  if (!address) return null;

  const lines: string[] = [];
  if (typeof address === "string") {
    lines.push(address);
  } else {
    if (address.name) lines.push(address.name);
    if (address.line1) lines.push(address.line1);
    if (address.line2) lines.push(address.line2);
    if (address.city) lines.push(address.city);
    if (address.postal_code || address.postcode) lines.push(address.postal_code || address.postcode);
    if (address.country) lines.push(address.country);
  }

  if (lines.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Delivery Address</h3>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">
        {lines.map((line, i) => (
          <span key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    </div>
  );
}

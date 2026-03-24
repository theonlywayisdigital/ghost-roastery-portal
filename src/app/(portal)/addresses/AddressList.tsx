"use client";

import { MapPin } from "@/components/icons";

interface Address {
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postalCode: string;
  country?: string;
}

export function AddressList({ addresses }: { addresses: Address[] }) {
  if (addresses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          No addresses saved
        </h3>
        <p className="text-slate-500">
          Delivery addresses from your orders will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {addresses.map((addr, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-slate-200 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-sm text-slate-700 leading-relaxed">
              {addr.name && (
                <p className="font-medium text-slate-900">{addr.name}</p>
              )}
              <p>{addr.address_line_1}</p>
              {addr.address_line_2 && <p>{addr.address_line_2}</p>}
              <p>{addr.city}</p>
              <p>{addr.postalCode}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

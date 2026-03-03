"use client";

import { formatPrice } from "./format";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface OrderSummaryCardProps {
  order: any;
  orderType: string;
  showPayoutInfo?: boolean; // true for roaster/admin views
}

function getItemName(item: any): string {
  return item.name || item.product_name || "Unknown item";
}

function getItemTotal(item: any): number {
  if (item.unitAmount) return (item.unitAmount * item.quantity) / 100;
  if (item.unit_price) return item.unit_price * item.quantity;
  return 0;
}

export function OrderSummaryCard({ order, orderType, showPayoutInfo }: OrderSummaryCardProps) {
  const isGhost = orderType === "ghost";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Order Summary</h3>

      {isGhost ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Bag Colour" value={order.bag_colour} />
            <DetailRow label="Bag Size" value={order.bag_size} />
            <DetailRow label="Roast Profile" value={order.roast_profile} />
            <DetailRow label="Grind" value={order.grind} />
            <DetailRow label="Quantity" value={`${order.quantity} bags`} />
            <DetailRow label="Brand" value={order.brand_name || "\u2014"} />
          </div>
          <div className="border-t border-slate-200 pt-4 mt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{`${order.quantity} \u00d7 ${formatPrice(Number(order.price_per_bag))}`}</span>
              <span className="text-slate-700">{formatPrice(order.total_price)}</span>
            </div>
            {showPayoutInfo && order.partner_payout_total != null && (
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-900">Partner Payout</span>
                <span className="text-slate-900">{formatPrice(order.partner_payout_total)}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(order.items as any[])?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-slate-700">{`${item.quantity || 1}\u00d7 ${getItemName(item)}${item.unit ? ` (${item.unit})` : ""}`}</span>
              <span className="text-slate-900 font-medium">{formatPrice(getItemTotal(item))}</span>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-700">{formatPrice(order.subtotal)}</span>
            </div>
            {(order.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{`Discount${order.discount_code ? ` (${order.discount_code})` : ""}`}</span>
                <span className="text-red-600">{`-${formatPrice(order.discount_amount)}`}</span>
              </div>
            )}
            {showPayoutInfo && order.roaster_payout != null && (
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-900">Roaster Payout</span>
                <span className="text-slate-900">{formatPrice(order.roaster_payout)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Wallet } from "@/components/icons";
import { StatusBadge } from "@/components/admin";
import { formatPrice } from "./format";

interface PayoutCardProps {
  payoutAmount: number | null;
  payoutStatus?: string | null;
  payoutBatchId?: string | null;
  roasterName?: string | null;
}

export function PayoutCard({ payoutAmount, payoutStatus, payoutBatchId, roasterName }: PayoutCardProps) {
  if (payoutAmount == null) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Partner Payout</h3>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-500">Payout Amount</p>
          <p className="text-lg font-semibold text-slate-900">{formatPrice(payoutAmount)}</p>
        </div>
        {roasterName && (
          <div>
            <p className="text-xs text-slate-500">Partner</p>
            <p className="text-sm text-slate-900">{roasterName}</p>
          </div>
        )}
        {payoutStatus && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status:</span>
            <StatusBadge status={payoutStatus} type="payoutStatus" />
          </div>
        )}
        {payoutBatchId && (
          <Link
            href={`/admin/finance/payouts/${payoutBatchId}`}
            className="inline-block text-xs text-brand-600 hover:text-brand-700"
          >
            View Payout Batch
          </Link>
        )}
      </div>
    </div>
  );
}

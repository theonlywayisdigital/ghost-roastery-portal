"use client";

import { useState, useCallback } from "react";
import { Plus, Upload } from "@/components/icons";
import { WholesaleBuyersPage } from "./WholesaleBuyersPage";
import { SettingsSection } from "./SettingsSection";
import { AddWholesaleCustomerModal } from "./AddWholesaleCustomerModal";
import { WholesaleImportWizard } from "./WholesaleImportWizard";

interface WholesaleBuyer {
  id: string;
  user_id: string;
  status: string;
  business_name: string;
  business_type: string | null;
  business_address: string | null;
  business_website: string | null;
  vat_number: string | null;
  monthly_volume: string | null;
  notes: string | null;
  payment_terms: string;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  contact_id: string | null;
  users: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
}

interface WholesaleSectionPageProps {
  buyers: WholesaleBuyer[];
  autoApprove: boolean;
  wholesaleStripeEnabled: boolean;
  autoApprovePaymentTerms: string;
  roasterId: string;
  hideHeader?: boolean;
}

export function WholesaleSectionPage({
  buyers: initialBuyers,
  autoApprove,
  wholesaleStripeEnabled,
  autoApprovePaymentTerms,
  roasterId,
  hideHeader = false,
}: WholesaleSectionPageProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [buyers, setBuyers] = useState(initialBuyers);

  const refreshBuyers = useCallback(async () => {
    try {
      const res = await fetch("/api/wholesale-buyers");
      if (res.ok) {
        const data = await res.json();
        setBuyers(data.buyers);
      }
    } catch (err) {
      console.error("Failed to refresh buyers:", err);
    }
  }, []);

  return (
    <div>
      <div className={`${hideHeader ? "mb-4" : "mb-6"} flex items-start justify-between`}>
        {!hideHeader && (
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wholesale</h1>
          <p className="text-slate-500 mt-1">
            Manage wholesale applications, active buyers, and settings.
          </p>
        </div>
        )}
        <div className={`${hideHeader ? "ml-auto" : ""} flex items-center gap-2`}>
        <button
          onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import CSV
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Wholesale Customer
        </button>
        </div>
      </div>

      {showImport ? (
        <WholesaleImportWizard
          onComplete={() => {
            setShowImport(false);
            refreshBuyers();
          }}
          onCancel={() => setShowImport(false)}
        />
      ) : (
        <>
          <SettingsSection autoApprove={autoApprove} wholesaleStripeEnabled={wholesaleStripeEnabled} autoApprovePaymentTerms={autoApprovePaymentTerms} roasterId={roasterId} />

          <WholesaleBuyersPage
            buyers={buyers}
            autoApprove={autoApprove}
            wholesaleStripeEnabled={wholesaleStripeEnabled}
            roasterId={roasterId}
            hideHeader
          />
        </>
      )}

      {showAddModal && (
        <AddWholesaleCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={refreshBuyers}
        />
      )}
    </div>
  );
}

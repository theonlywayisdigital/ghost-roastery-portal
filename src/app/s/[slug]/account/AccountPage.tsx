"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStorefront } from "../_components/StorefrontProvider";
import { Header } from "../_components/Header";
import { Cart } from "../_components/Cart";
import { Footer } from "../_components/Footer";
import { Plus, Pencil, Trash2, Star, X } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

interface WholesaleAccess {
  id: string;
  status: string;
  payment_terms: string | null;
  business_name: string | null;
  created_at: string;
}

interface BuyerAddress {
  id: string;
  label: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  is_default: boolean;
}

const WS_STATUS_COLOURS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700" },
  approved: { bg: "bg-green-100", text: "text-green-700" },
  rejected: { bg: "bg-red-100", text: "text-red-700" },
  suspended: { bg: "bg-slate-100", text: "text-slate-700" },
};

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  prepay: "Prepay",
  net7: "Net 7",
  net14: "Net 14",
  net30: "Net 30",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAddress(addr: BuyerAddress) {
  return [addr.address_line_1, addr.address_line_2, addr.city, addr.county, addr.postcode, addr.country]
    .filter(Boolean)
    .join(", ");
}

const EMPTY_FORM = {
  label: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  county: "",
  postcode: "",
  country: "United Kingdom",
};

export function AccountPage({
  slug,
  roasterId,
  profile,
  wholesaleAccess,
  addresses: initialAddresses,
}: {
  slug: string;
  roasterId: string;
  profile: Profile;
  wholesaleAccess: WholesaleAccess | null;
  addresses: BuyerAddress[];
}) {
  const { accent, accentText, embedded } = useStorefront();
  const router = useRouter();

  const [addresses, setAddresses] = useState<BuyerAddress[]>(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    await fetch(`/api/auth/logout?redirect=/s/${slug}`, { method: "POST" });
    router.push(`/s/${slug}`);
  }

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(addr: BuyerAddress) {
    setEditingId(addr.id);
    setForm({
      label: addr.label || "",
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2 || "",
      city: addr.city,
      county: addr.county || "",
      postcode: addr.postcode,
      country: addr.country,
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSave() {
    if (!form.address_line_1 || !form.city || !form.postcode) {
      setError("Address line 1, city, and postcode are required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const res = await fetch(`/api/s/buyer-addresses/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update");
        setAddresses((prev) =>
          prev.map((a) => (a.id === editingId ? data.address : a))
        );
      } else {
        const res = await fetch("/api/s/buyer-addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roasterId, ...form }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create");
        // If new address is default, update others
        if (data.address.is_default) {
          setAddresses((prev) =>
            [...prev.map((a) => ({ ...a, is_default: false })), data.address]
          );
        } else {
          setAddresses((prev) => [...prev, data.address]);
        }
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;

    try {
      const res = await fetch(`/api/s/buyer-addresses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      const deleted = addresses.find((a) => a.id === id);
      let updated = addresses.filter((a) => a.id !== id);

      // If deleted was default and there are remaining, first one becomes default
      if (deleted?.is_default && updated.length > 0) {
        updated = updated.map((a, i) =>
          i === 0 ? { ...a, is_default: true } : a
        );
      }
      setAddresses(updated);
    } catch {
      // Silently fail
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/s/buyer-addresses/${id}/default`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to set default");
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
      );
    } catch {
      // Silently fail
    }
  }

  return (
    <div style={{ fontFamily: "var(--sf-font)" }} className="min-h-screen">
      <Header />
      <Cart />
      {!embedded && <div className="h-16 md:h-20" />}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold mb-8" style={{ color: "var(--sf-text)" }}>My Account</h1>

        {/* Profile section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Full Name
              </label>
              <p className="text-sm text-slate-900">
                {profile.full_name || "—"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Email
              </label>
              <p className="text-sm text-slate-900">{profile.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Member Since
              </label>
              <p className="text-sm text-slate-900">
                {formatDate(profile.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Wholesale account section */}
        {wholesaleAccess && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Wholesale Account
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-slate-500">
                  Status
                </label>
                {(() => {
                  const colours =
                    WS_STATUS_COLOURS[wholesaleAccess.status] ||
                    WS_STATUS_COLOURS.pending;
                  return (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colours.bg} ${colours.text}`}
                    >
                      {wholesaleAccess.status}
                    </span>
                  );
                })()}
              </div>
              {wholesaleAccess.business_name && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Business Name
                  </label>
                  <p className="text-sm text-slate-900">
                    {wholesaleAccess.business_name}
                  </p>
                </div>
              )}
              {wholesaleAccess.status === "approved" &&
                wholesaleAccess.payment_terms && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Payment Terms
                    </label>
                    <p className="text-sm text-slate-900">
                      {PAYMENT_TERMS_LABELS[wholesaleAccess.payment_terms] ||
                        wholesaleAccess.payment_terms}
                    </p>
                  </div>
                )}
              {wholesaleAccess.status === "approved" && (
                <Link
                  href={`/s/${slug}/wholesale`}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent, color: accentText }}
                >
                  Access Wholesale Catalogue
                </Link>
              )}
              {wholesaleAccess.status === "pending" && (
                <p className="text-sm text-amber-600">
                  Your application is under review. We&apos;ll notify you once
                  it&apos;s been processed.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Delivery Addresses section */}
        {wholesaleAccess && wholesaleAccess.status === "approved" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Delivery Addresses
              </h2>
              <button
                onClick={openAddForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: accent, color: accentText }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Address
              </button>
            </div>

            {addresses.length === 0 && !showForm && (
              <p className="text-sm text-slate-500">
                No delivery addresses saved. Add one to speed up checkout.
              </p>
            )}

            {/* Address list */}
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`relative rounded-lg border p-4 ${addr.is_default ? "border-slate-300 bg-slate-50" : "border-slate-200"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {addr.label && (
                          <span className="text-sm font-medium text-slate-900">
                            {addr.label}
                          </span>
                        )}
                        {addr.is_default && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {formatAddress(addr)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!addr.is_default && (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Set as default"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditForm(addr)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(addr.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add/Edit form */}
            {showForm && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-900">
                    {editingId ? "Edit Address" : "New Address"}
                  </h3>
                  <button
                    onClick={closeForm}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Label (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Head Office, Warehouse"
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={form.address_line_1}
                      onChange={(e) => setForm({ ...form, address_line_1: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={form.address_line_2}
                      onChange={(e) => setForm({ ...form, address_line_2: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      County
                    </label>
                    <input
                      type="text"
                      value={form.county}
                      onChange={(e) => setForm({ ...form, county: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Postcode *
                    </label>
                    <input
                      type="text"
                      value={form.postcode}
                      onChange={(e) => setForm({ ...form, postcode: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                </div>

                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={closeForm}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: accent, color: accentText }}
                  >
                    {saving ? "Saving..." : editingId ? "Update" : "Save Address"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
          style={{ color: "color-mix(in srgb, var(--sf-text) 65%, transparent)" }}
        >
          Sign Out
        </button>
      </div>

      <Footer />
    </div>
  );
}

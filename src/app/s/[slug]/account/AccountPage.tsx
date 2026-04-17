"use client";

import { useState } from "react";
import Link from "next/link";
import { useStorefront } from "../_components/StorefrontProvider";
import { Header } from "../_components/Header";
import { Cart } from "../_components/Cart";
import { Footer } from "../_components/Footer";
import { Plus, Pencil, Trash2, Star, X, Check } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
}

interface WholesaleAccess {
  id: string;
  status: string;
  payment_terms: string | null;
  business_name: string | null;
  vat_number: string | null;
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

const EMPTY_ADDR_FORM = {
  label: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  county: "",
  postcode: "",
  country: "GB",
};

function splitNameLocal(fullName: string | null): { first: string; last: string } {
  if (!fullName) return { first: "", last: "" };
  const trimmed = fullName.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return { first: trimmed, last: "" };
  return {
    first: trimmed.slice(0, spaceIdx),
    last: trimmed.slice(spaceIdx + 1),
  };
}

const inputClassName =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300";

function FeedbackMessage({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-sm mt-3 ${
        type === "success" ? "text-green-600" : "text-red-600"
      }`}
    >
      {type === "success" && <Check className="w-4 h-4 shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

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
  const { accent, accentText } = useStorefront();

  // ─── Personal Details state ───
  const { first, last } = splitNameLocal(profile.full_name);
  const [firstName, setFirstName] = useState(first);
  const [lastName, setLastName] = useState(last);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone || "");
  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalFeedback, setPersonalFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ─── Email state ───
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ─── Business Details state ───
  const [businessName, setBusinessName] = useState(
    wholesaleAccess?.business_name || ""
  );
  const [vatNumber, setVatNumber] = useState(
    wholesaleAccess?.vat_number || ""
  );
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessFeedback, setBusinessFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ─── Password state ───
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ─── Address state ───
  const [addresses, setAddresses] = useState<BuyerAddress[]>(initialAddresses);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR_FORM);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    window.location.href = `/s/${slug}`;
  }

  // ─── Personal Details save ───
  async function handleSavePersonal() {
    setPersonalSaving(true);
    setPersonalFeedback(null);

    try {
      const res = await fetch("/api/s/buyer-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: phone || null,
          roasterId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPersonalFeedback({
          type: "error",
          message: data.error || "Failed to save",
        });
        return;
      }

      setPersonalFeedback({
        type: "success",
        message: "Personal details updated",
      });
    } catch {
      setPersonalFeedback({
        type: "error",
        message: "Something went wrong",
      });
    } finally {
      setPersonalSaving(false);
    }
  }

  // ─── Email save ───
  async function handleSaveEmail() {
    if (email === profile.email) return;

    setEmailSaving(true);
    setEmailFeedback(null);

    try {
      const res = await fetch("/api/s/buyer-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEmailFeedback({
          type: "error",
          message: data.error || "Failed to update email",
        });
        return;
      }

      setEmailFeedback({
        type: "success",
        message: "Email updated. A confirmation may be sent to verify the new address.",
      });
    } catch {
      setEmailFeedback({
        type: "error",
        message: "Something went wrong",
      });
    } finally {
      setEmailSaving(false);
    }
  }

  // ─── Business Details save ───
  async function handleSaveBusiness() {
    setBusinessSaving(true);
    setBusinessFeedback(null);

    try {
      const res = await fetch("/api/s/buyer-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          vatNumber: vatNumber || null,
          roasterId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setBusinessFeedback({
          type: "error",
          message: data.error || "Failed to save",
        });
        return;
      }

      setBusinessFeedback({
        type: "success",
        message: "Business details updated",
      });
    } catch {
      setBusinessFeedback({
        type: "error",
        message: "Something went wrong",
      });
    } finally {
      setBusinessSaving(false);
    }
  }

  // ─── Password save ───
  async function handleSavePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Passwords do not match",
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({
        type: "error",
        message: "Password must be at least 8 characters",
      });
      return;
    }

    setPasswordSaving(true);
    setPasswordFeedback(null);

    try {
      const res = await fetch("/api/s/buyer-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPasswordFeedback({
          type: "error",
          message: data.error || "Failed to change password",
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({
        type: "success",
        message: "Password changed successfully",
      });
    } catch {
      setPasswordFeedback({
        type: "error",
        message: "Something went wrong",
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  // ─── Address handlers ───
  function openAddAddr() {
    setEditingAddrId(null);
    setAddrForm(EMPTY_ADDR_FORM);
    setAddrError(null);
    setShowAddrForm(true);
  }

  function openEditAddr(addr: BuyerAddress) {
    setEditingAddrId(addr.id);
    setAddrForm({
      label: addr.label || "",
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2 || "",
      city: addr.city,
      county: addr.county || "",
      postcode: addr.postcode,
      country: addr.country,
    });
    setAddrError(null);
    setShowAddrForm(true);
  }

  function closeAddrForm() {
    setShowAddrForm(false);
    setEditingAddrId(null);
    setAddrForm(EMPTY_ADDR_FORM);
    setAddrError(null);
  }

  async function handleSaveAddr() {
    if (!addrForm.address_line_1 || !addrForm.city || !addrForm.postcode) {
      setAddrError("Address line 1, city, and postcode are required.");
      return;
    }

    setAddrSaving(true);
    setAddrError(null);

    try {
      if (editingAddrId) {
        const res = await fetch(`/api/s/buyer-addresses/${editingAddrId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addrForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update");
        setAddresses((prev) =>
          prev.map((a) => (a.id === editingAddrId ? data.address : a))
        );
      } else {
        const res = await fetch("/api/s/buyer-addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roasterId, ...addrForm }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create");
        if (data.address.is_default) {
          setAddresses((prev) =>
            [...prev.map((a) => ({ ...a, is_default: false })), data.address]
          );
        } else {
          setAddresses((prev) => [...prev, data.address]);
        }
      }
      closeAddrForm();
    } catch (err) {
      setAddrError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddrSaving(false);
    }
  }

  async function handleDeleteAddr(id: string) {
    if (!confirm("Delete this address?")) return;

    try {
      const res = await fetch(`/api/s/buyer-addresses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      const deleted = addresses.find((a) => a.id === id);
      let updated = addresses.filter((a) => a.id !== id);

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

  async function handleSetDefaultAddr(id: string) {
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1
          className="text-2xl font-bold mb-8"
          style={{ color: "var(--sf-text)" }}
        >
          My Account
        </h1>

        {/* ─── Personal Details ─── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Personal Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
                className={inputClassName}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex-1">
              {personalFeedback && (
                <FeedbackMessage
                  type={personalFeedback.type}
                  message={personalFeedback.message}
                />
              )}
            </div>
            <button
              onClick={handleSavePersonal}
              disabled={personalSaving}
              className="px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0 ml-4"
              style={{ backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }}
            >
              {personalSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* ─── Email ─── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Email Address
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
            />
            <p className="text-xs text-slate-400 mt-1.5">
              A confirmation email will be sent to verify your new address.
            </p>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex-1">
              {emailFeedback && (
                <FeedbackMessage
                  type={emailFeedback.type}
                  message={emailFeedback.message}
                />
              )}
            </div>
            <button
              onClick={handleSaveEmail}
              disabled={emailSaving || email === profile.email}
              className="px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0 ml-4"
              style={
                email !== profile.email && !emailSaving
                  ? { backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }
                  : { borderRadius: "var(--sf-btn-radius)" }
              }
            >
              {emailSaving ? "Saving..." : "Update Email"}
            </button>
          </div>
        </div>

        {/* ─── Business Details (wholesale only) ─── */}
        {wholesaleAccess && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Business Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  VAT Number
                </label>
                <input
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="GB123456789"
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex-1">
                {businessFeedback && (
                  <FeedbackMessage
                    type={businessFeedback.type}
                    message={businessFeedback.message}
                  />
                )}
              </div>
              <button
                onClick={handleSaveBusiness}
                disabled={businessSaving}
                className="px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0 ml-4"
                style={{ backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }}
              >
                {businessSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* ─── Wholesale Account (read-only) ─── */}
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
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Member Since
                </label>
                <p className="text-sm text-slate-900">
                  {formatDate(wholesaleAccess.created_at)}
                </p>
              </div>
              {wholesaleAccess.status === "approved" && (
                <Link
                  href={`/s/${slug}/wholesale`}
                  className="inline-flex items-center px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }}
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

        {/* ─── Delivery Addresses ─── */}
        {wholesaleAccess && wholesaleAccess.status === "approved" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Delivery Addresses
              </h2>
              <button
                onClick={openAddAddr}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Address
              </button>
            </div>

            {addresses.length === 0 && !showAddrForm && (
              <p className="text-sm text-slate-500">
                No delivery addresses saved. Add one to speed up checkout.
              </p>
            )}

            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`relative rounded-lg border p-4 ${
                    addr.is_default
                      ? "border-slate-300 bg-slate-50"
                      : "border-slate-200"
                  }`}
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
                          onClick={() => handleSetDefaultAddr(addr.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Set as default"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditAddr(addr)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddr(addr.id)}
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

            {showAddrForm && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-900">
                    {editingAddrId ? "Edit Address" : "New Address"}
                  </h3>
                  <button
                    onClick={closeAddrForm}
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
                      value={addrForm.label}
                      onChange={(e) =>
                        setAddrForm({ ...addrForm, label: e.target.value })
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={addrForm.address_line_1}
                      onChange={(e) =>
                        setAddrForm({
                          ...addrForm,
                          address_line_1: e.target.value,
                        })
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={addrForm.address_line_2}
                      onChange={(e) =>
                        setAddrForm({
                          ...addrForm,
                          address_line_2: e.target.value,
                        })
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={addrForm.city}
                      onChange={(e) =>
                        setAddrForm({ ...addrForm, city: e.target.value })
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      County
                    </label>
                    <input
                      type="text"
                      value={addrForm.county}
                      onChange={(e) =>
                        setAddrForm({ ...addrForm, county: e.target.value })
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Postcode *
                    </label>
                    <input
                      type="text"
                      value={addrForm.postcode}
                      onChange={(e) =>
                        setAddrForm({ ...addrForm, postcode: e.target.value })
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={addrForm.country}
                      onChange={(e) =>
                        setAddrForm({ ...addrForm, country: e.target.value })
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>

                {addrError && (
                  <p className="mt-2 text-sm text-red-600">{addrError}</p>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={closeAddrForm}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAddr}
                    disabled={addrSaving}
                    className="px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }}
                  >
                    {addrSaving
                      ? "Saving..."
                      : editingAddrId
                        ? "Update"
                        : "Save Address"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Change Password ─── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Change Password
          </h2>
          <div className="space-y-4 max-w-sm">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex-1">
              {passwordFeedback && (
                <FeedbackMessage
                  type={passwordFeedback.type}
                  message={passwordFeedback.message}
                />
              )}
            </div>
            <button
              onClick={handleSavePassword}
              disabled={
                passwordSaving ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              className="px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0 ml-4"
              style={
                currentPassword && newPassword && confirmPassword && !passwordSaving
                  ? { backgroundColor: accent, color: accentText, borderRadius: "var(--sf-btn-radius)" }
                  : { borderRadius: "var(--sf-btn-radius)" }
              }
            >
              {passwordSaving ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>

        {/* ─── Sign Out ─── */}
        <button
          onClick={handleSignOut}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
          style={{
            color:
              "color-mix(in srgb, var(--sf-text) 65%, transparent)",
          }}
        >
          Sign Out
        </button>
      </div>

      <Footer />
    </div>
  );
}

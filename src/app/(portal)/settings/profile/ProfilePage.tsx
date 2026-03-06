"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  UserCircle,
  Camera,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
} from "@/components/icons";
import { SettingsHeader } from "@/components/SettingsHeader";

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url: string | null;
}

export function ProfilePage({ userId, email }: { userId: string; email: string }) {
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/profile");
      if (res.ok) {
        const data: ProfileData = await res.json();
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setPhone(data.phone);
        setAvatarUrl(data.avatar_url);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Failed to save profile");
    }
    setSaving(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/settings/profile/photo", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.url);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to upload photo");
      }
    } catch {
      setError("Failed to upload photo");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemovePhoto() {
    try {
      const res = await fetch("/api/settings/profile/photo", { method: "DELETE" });
      if (res.ok) {
        setAvatarUrl(null);
      }
    } catch {
      setError("Failed to remove photo");
    }
  }

  async function handlePasswordChange() {
    setSavingPassword(true);
    setPasswordSaved(false);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      setSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      setSavingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/settings/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword, confirm_password: confirmPassword }),
      });
      if (res.ok) {
        setPasswordSaved(true);
        setNewPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setTimeout(() => setPasswordSaved(false), 3000);
      } else {
        const data = await res.json();
        setPasswordError(data.error || "Failed to change password");
      }
    } catch {
      setPasswordError("Failed to change password");
    }
    setSavingPassword(false);
  }

  async function handleDeleteRequest() {
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/settings/profile/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason }),
      });
      if (res.ok) {
        setDeleteRequested(true);
        setShowDeleteModal(false);
      }
    } catch {
      // Silently fail
    }
    setDeletingAccount(false);
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
          <p className="text-slate-500 mt-1">Manage your personal account details.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SettingsHeader
        title="Profile"
        description="Manage your personal account details."
        breadcrumb="Profile"
      />

      <div className="space-y-6">
        {/* ─── Profile Photo ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Profile Photo</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-5">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserCircle className="w-10 h-10 text-slate-400" />
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {uploading ? "Uploading..." : avatarUrl ? "Change" : "Upload"}
                </button>
                {avatarUrl && (
                  <button
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">JPG, PNG, or WebP. Max 2MB.</p>
          </div>
        </section>

        {/* ─── Personal Details ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Personal Details</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-500 bg-slate-50"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Contact support to change your email address.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +44 7700 900000"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {saved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ─── Password ─── */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
              </div>
              {showPassword ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
          </div>
          {showPassword && (
            <div className="p-6">
              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {passwordError}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePasswordChange}
                    disabled={savingPassword || !newPassword}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {savingPassword ? "Updating..." : "Update Password"}
                  </button>
                  {passwordSaved && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Password updated
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ─── Danger Zone: Delete Account ─── */}
        <section className="bg-white rounded-xl border border-red-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
            </div>
          </div>
          <div className="p-6">
            {deleteRequested ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800">
                  Account deletion request submitted
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {"We'll process your request within 48 hours. You'll receive a confirmation email."}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600 mb-4">
                  Once your account is deleted, all of your data will be permanently removed.
                  This includes your storefront, products, orders, and customer data.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Delete My Account
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-slate-900">Delete Account</h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <p className="text-sm text-slate-600">
                This will permanently delete:
              </p>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>Your account and login credentials</li>
                <li>Your storefront and all published content</li>
                <li>All products and product data</li>
                <li>Order history and customer records</li>
                <li>Wholesale buyer relationships</li>
              </ul>
              <p className="text-sm font-medium text-red-600">
                This action cannot be undone.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reason for leaving (optional)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Help us improve..."
                rows={2}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRequest}
                disabled={deletingAccount}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingAccount ? "Submitting..." : "Delete My Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

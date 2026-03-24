"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
} from "@/components/icons";
import { SettingsHeader } from "@/components/SettingsHeader";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
}

export function EmailTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingItem, setEditingItem] = useState<Partial<EmailTemplate> | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/email-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error("Failed to load email templates:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveItem() {
    if (!editingItem?.name?.trim()) return;
    setSavingItem(true);

    try {
      const isNew = !editingItem.id;
      const url = isNew
        ? "/api/settings/email-templates"
        : `/api/settings/email-templates/${editingItem.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingItem.name,
          subject: editingItem.subject || "",
          body: editingItem.body || "",
        }),
      });

      if (res.ok) {
        setEditingItem(null);
        const refreshRes = await fetch("/api/settings/email-templates");
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setTemplates(data.templates);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save template");
      }
    } catch {
      setError("Failed to save template");
    }
    setSavingItem(false);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/settings/email-templates/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      } else {
        setError("Failed to delete template");
      }
    } catch {
      setError("Failed to delete template");
    }
    setConfirmDelete(null);
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Email Templates</h1>
          <p className="text-slate-500 mt-1">Reusable templates for direct contact emails.</p>
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
        title="Email Templates"
        description="Reusable templates for direct contact emails."
        breadcrumb="Email Templates"
      />

      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Email Templates</h2>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Create templates with a subject line and body to quickly compose emails to contacts.
                </p>
              </div>
              <button
                onClick={() =>
                  setEditingItem({ name: "", subject: "", body: "" })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Template
              </button>
            </div>
          </div>
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
                <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
                  <X className="w-4 h-4 inline" />
                </button>
              </div>
            )}

            {templates.length === 0 && !editingItem ? (
              <div className="text-center py-8">
                <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  No email templates yet. Create your first template to quickly compose emails to contacts.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-slate-200 bg-white"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{item.name}</p>
                      {item.subject && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {`Subject: ${item.subject}`}
                        </p>
                      )}
                      {item.body && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {item.body.slice(0, 80)}
                          {item.body.length > 80 ? "..." : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Edit/Add Modal */}
            {editingItem && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {editingItem.id ? "Edit Template" : "Add Template"}
                    </h3>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={editingItem.name || ""}
                        onChange={(e) =>
                          setEditingItem((prev) => prev ? { ...prev, name: e.target.value } : null)
                        }
                        placeholder='e.g. "Follow-Up", "Welcome", "Price List"'
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={editingItem.subject || ""}
                        onChange={(e) =>
                          setEditingItem((prev) => prev ? { ...prev, subject: e.target.value } : null)
                        }
                        placeholder="Email subject"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Body
                      </label>
                      <textarea
                        value={editingItem.body || ""}
                        onChange={(e) =>
                          setEditingItem((prev) => prev ? { ...prev, body: e.target.value } : null)
                        }
                        placeholder="Write your template body..."
                        rows={8}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Plain text. Subject and body can be edited before sending.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setEditingItem(null)}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveItem}
                      disabled={savingItem || !editingItem.name?.trim()}
                      className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {savingItem ? "Saving..." : editingItem.id ? "Update" : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Delete Template
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    {`Are you sure you want to delete "${templates.find((t) => t.id === confirmDelete)?.name}"? This cannot be undone.`}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(confirmDelete)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

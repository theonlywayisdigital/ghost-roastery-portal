"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FileText, Download, Pencil, Trash2 } from "lucide-react";

interface SavedLabel {
  id: string;
  name: string;
  thumbnail_url: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function SavedLabelsSection({
  labels: initialLabels,
  siteUrl,
}: {
  labels: SavedLabel[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [labels, setLabels] = useState(initialLabels);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (labels.length === 0) return null;

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this label? This cannot be undone.")) return;

    setDeleting(id);
    try {
      const res = await fetch(`${siteUrl}/api/label/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setLabels((prev) => prev.filter((l) => l.id !== id));
        router.refresh();
      } else {
        alert("Failed to delete label. Please try again.");
      }
    } catch {
      alert("Failed to delete label. Please try again.");
    }
    setDeleting(null);
  };

  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">
        Saved Labels
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Labels you've designed in the Label Maker.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {labels.map((label) => (
          <div
            key={label.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            {/* Thumbnail */}
            <div className="h-40 bg-slate-100 flex items-center justify-center">
              {label.thumbnail_url ? (
                <Image
                  src={label.thumbnail_url}
                  alt={label.name}
                  width={160}
                  height={160}
                  className="h-full w-auto object-contain"
                />
              ) : (
                <FileText className="w-10 h-10 text-slate-300" />
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-semibold text-slate-900 mb-1">
                {label.name}
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                {`Last edited ${timeAgo(label.updated_at)}`}
              </p>

              <div className="flex items-center gap-3">
                {label.pdf_url && (
                  <a
                    href={label.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </a>
                )}
                <a
                  href={`${siteUrl}/label-maker?labelId=${label.id}`}
                  className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </a>
                <button
                  onClick={() => handleDelete(label.id)}
                  disabled={deleting === label.id}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-600 transition-colors ml-auto disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

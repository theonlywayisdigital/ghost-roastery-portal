"use client";

import { Download, CheckCircle, AlertTriangle, Printer } from "lucide-react";
import { StatusBadge } from "@/components/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ArtworkCardProps {
  order: any;
  label?: any;
  showActions?: boolean; // Admin can approve/reject/send to print
  onArtworkAction?: (action: string) => void;
  isLoading?: boolean;
}

export function ArtworkCard({ order, label, showActions, onArtworkAction, isLoading }: ArtworkCardProps) {
  // Only show for Ghost orders with artwork
  if (!order.label_file_url && !order.mockup_image_url && !label?.thumbnail_url) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Artwork & Label</h3>
      <div className="space-y-4">
        {(label?.thumbnail_url || order.mockup_image_url) && (
          <div className="flex items-start gap-4">
            <img
              src={label?.thumbnail_url || order.mockup_image_url}
              alt="Label preview"
              className="w-24 h-24 object-contain rounded-lg bg-slate-50 border border-slate-200"
            />
            <div className="space-y-2">
              {(label?.pdf_url || order.label_file_url) && (
                <a
                  href={label?.pdf_url || order.label_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
                >
                  <Download className="w-4 h-4" />
                  Download Label File
                </a>
              )}
            </div>
          </div>
        )}

        {order.artwork_status && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status:</span>
            <StatusBadge status={order.artwork_status} type="artwork" />
          </div>
        )}

        {showActions && onArtworkAction && (
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => onArtworkAction("approved")}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" /> Approve
            </button>
            <button
              onClick={() => onArtworkAction("needs_edit")}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm hover:bg-orange-100 transition-colors disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" /> Needs Changes
            </button>
            <button
              onClick={() => onArtworkAction("sent_to_print")}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Send to Printer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

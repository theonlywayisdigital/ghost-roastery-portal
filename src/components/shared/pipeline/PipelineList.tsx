"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Trash2 } from "@/components/icons";
import type { PipelineItem } from "./PipelineCard";
import type { PipelineStage } from "@/lib/pipeline";

interface PipelineListProps {
  items: PipelineItem[];
  stages: PipelineStage[];
  detailBase: string;
  businessDetailBase: string;
  isLoading: boolean;
  onDelete?: (item: PipelineItem) => void;
}

export function PipelineList({ items, stages, detailBase, businessDetailBase, isLoading, onDelete }: PipelineListProps) {
  const router = useRouter();
  const [confirmItem, setConfirmItem] = useState<PipelineItem | null>(null);

  const columns: Column<PipelineItem>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-900">{row.name}</p>
          {row.itemType === "contact" && row.businessName && (
            <p className="text-xs text-slate-500">{row.businessName}</p>
          )}
        </div>
      ),
    },
    {
      key: "itemType",
      label: "Type",
      hiddenOnMobile: true,
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          row.itemType === "business"
            ? "bg-purple-50 text-purple-700"
            : "bg-blue-50 text-blue-700"
        }`}>
          {row.itemType === "business" ? "Business" : "Contact"}
        </span>
      ),
    },
    {
      key: "email",
      label: "Email",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-500">{row.email || "—"}</span>
      ),
    },
    {
      key: "leadStatus",
      label: "Stage",
      render: (row) => {
        const stage = stages.find((s) => s.slug === row.leadStatus);
        return (
          <StatusBadge
            status={row.leadStatus}
            type="leadStatus"
            stageColour={stage?.colour}
            stageLabel={stage?.name}
          />
        );
      },
    },
    {
      key: "source",
      label: "Source",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-500 capitalize">{row.source}</span>
      ),
    },
    {
      key: "totalSpend",
      label: "Spend",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-700 font-medium">
          {row.totalSpend > 0 ? `£${row.totalSpend.toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      hiddenOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-500">
          {new Date(row.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    ...(onDelete
      ? [
          {
            key: "actions",
            label: "",
            render: (row: PipelineItem) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmItem(row);
                }}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Remove from pipeline"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ),
          },
        ]
      : []),
  ];

  function handleRowClick(item: PipelineItem) {
    if (item.itemType === "business") {
      router.push(`${businessDetailBase}/${item.id}`);
    } else {
      router.push(`${detailBase}/${item.id}`);
    }
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        onRowClick={handleRowClick}
        getRowId={(row) => `${row.itemType}-${row.id}`}
        isLoading={isLoading}
        emptyMessage="No leads in the pipeline"
      />

      {/* Delete confirmation modal */}
      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove from pipeline?</h3>
            <p className="text-sm text-slate-600 mb-6">
              This will remove <span className="font-medium">{confirmItem.name}</span> from the pipeline. The record will not be deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmItem(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete?.(confirmItem);
                  setConfirmItem(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

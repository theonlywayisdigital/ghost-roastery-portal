"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Upload, Check, Scale } from "@/components/icons";
import { DataTable, FilterBar, Pagination } from "@/components/admin";
import type { Column, FilterConfig } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useUpgradeBanner } from "@/hooks/useUpgradeBanner";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";
import { QuickRebalanceModal } from "@/components/inventory/QuickRebalanceModal";

interface GreenBean {
  id: string;
  name: string;
  origin_country: string | null;
  variety: string | null;
  process: string | null;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  cost_per_kg: number | null;
  is_active: boolean;
  suppliers: { name: string } | null;
  created_at: string;
}

const PAGE_SIZE = 25;

const filters: FilterConfig[] = [
  { key: "search", label: "Search beans...", type: "search" },
  {
    key: "stock",
    label: "Stock Level",
    type: "select",
    options: [
      { value: "low", label: "Low Stock" },
      { value: "out", label: "Out of Stock" },
      { value: "ok", label: "In Stock" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

function getStockStatus(bean: GreenBean): "ok" | "low" | "out" {
  if (bean.current_stock_kg <= 0) return "out";
  if (bean.low_stock_threshold_kg && bean.current_stock_kg <= bean.low_stock_threshold_kg) return "low";
  return "ok";
}

function QuickAddStock({ beanId, onAdded }: { beanId: string; onAdded: (newBalance: number) => void }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => { setMounted(true); }, []);

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.right - 208 });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qty || saving) return;
    setSaving(true);

    const res = await fetch(`/api/tools/green-beans/${beanId}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movement_type: "purchase", quantity_kg: qty, unit_cost: null, notes: "Quick add from listing" }),
    });

    if (res.ok) {
      const data = await res.json();
      onAdded(data.balance);
      setQty("");
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setOpen(false); }, 800);
    }
    setSaving(false);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-600 bg-brand-50 rounded-md hover:bg-brand-100 transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add Stock
      </button>
      {open && mounted && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-52"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {success ? (
            <div className="flex items-center gap-2 text-sm text-green-600 py-1">
              <Check className="w-4 h-4" /> Stock added
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2">
              <label className="block text-xs font-medium text-slate-600">Quantity (kg)</label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                min="0.001"
                step="0.001"
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={saving || !qty}
                className="w-full px-3 py-1.5 bg-brand-600 text-white rounded-md text-xs font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Adding..." : "Add Purchase"}
              </button>
            </form>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

export function GreenBeansTable({ beans: initial }: { beans: GreenBean[] }) {
  const router = useRouter();
  const [beans, setBeans] = useState(initial);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const banner = useUpgradeBanner("greenBeans");
  const [rebalanceItem, setRebalanceItem] = useState<{ id: string; name: string; currentKg: number } | null>(null);

  const filtered = useMemo(() => {
    let result = [...beans];

    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.origin_country?.toLowerCase().includes(q) ||
          b.variety?.toLowerCase().includes(q) ||
          b.process?.toLowerCase().includes(q)
      );
    }

    if (filterValues.stock) {
      result = result.filter((b) => getStockStatus(b) === filterValues.stock);
    }

    if (filterValues.status === "active") result = result.filter((b) => b.is_active);
    if (filterValues.status === "inactive") result = result.filter((b) => !b.is_active);

    result.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortKey] ?? "";
      const bVal = (b as unknown as Record<string, unknown>)[sortKey] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [beans, filterValues, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function handleQuickAdd(beanId: string, newBalance: number) {
    setBeans((prev) => prev.map((b) => b.id === beanId ? { ...b, current_stock_kg: newBalance } : b));
  }

  const columns: Column<GreenBean>[] = [
    {
      key: "name",
      label: "Bean",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          {row.origin_country && <p className="text-xs text-slate-500">{row.origin_country}</p>}
        </div>
      ),
    },
    {
      key: "variety",
      label: "Variety",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.variety || "—"}</span>,
    },
    {
      key: "process",
      label: "Process",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.process || "—"}</span>,
    },
    {
      key: "suppliers",
      label: "Supplier",
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.suppliers?.name || "—"}</span>,
    },
    {
      key: "current_stock_kg",
      label: "Stock (kg)",
      sortable: true,
      render: (row) => <span className="font-medium text-slate-900">{Number(row.current_stock_kg).toFixed(2)}</span>,
    },
    {
      key: "cost_per_kg",
      label: "Cost/kg",
      sortable: true,
      hiddenOnMobile: true,
      render: (row) => <span className="text-slate-600">{row.cost_per_kg ? `£${Number(row.cost_per_kg).toFixed(2)}` : "—"}</span>,
    },
    {
      key: "stock_status",
      label: "Status",
      render: (row) => <StatusBadge status={getStockStatus(row)} type="stockAlert" />,
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <QuickAddStock beanId={row.id} onAdded={(bal) => handleQuickAdd(row.id, bal)} />
          <button
            onClick={(e) => { e.stopPropagation(); setRebalanceItem({ id: row.id, name: row.name, currentKg: Number(row.current_stock_kg) }); }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Scale className="w-3 h-3" />
            Set
          </button>
        </div>
      ),
    },
  ];

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Green Bean Inventory</h1>
          <p className="text-slate-500 mt-1">Track your green bean stock, origins, and suppliers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tools/inventory/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </Link>
          <Link
            href="/tools/inventory/green/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Bean
          </Link>
        </div>
      </div>

      {banner.show && (
        <div className="mb-6">
          <UpgradeBanner type={banner.type} message={banner.message} upgradeTier={banner.upgradeTier} productType={banner.productType} />
        </div>
      )}

      <div className="mb-4">
        <FilterBar
          filters={filters}
          values={filterValues}
          onChange={(key, value) => { setFilterValues((prev) => ({ ...prev, [key]: value })); setPage(1); }}
          onClear={() => { setFilterValues({}); setPage(1); }}
        />
      </div>

      <DataTable
        columns={columns}
        data={paginated}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDir}
        onRowClick={(row) => router.push(`/tools/inventory/green/${row.id}`)}
        emptyMessage="No green beans yet — add your first bean to get started."
      />

      {filtered.length > pageSize && (
        <div className="mt-4">
          <Pagination page={page} total={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}

      {rebalanceItem && (
        <QuickRebalanceModal
          open={!!rebalanceItem}
          onClose={() => setRebalanceItem(null)}
          onSuccess={() => { setRebalanceItem(null); router.refresh(); }}
          item={{ type: "green", id: rebalanceItem.id, name: rebalanceItem.name, currentKg: rebalanceItem.currentKg }}
        />
      )}
    </div>
  );
}

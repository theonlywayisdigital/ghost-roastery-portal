"use client";

import { ArrowUpDown, ArrowUp, ArrowDown } from "@/components/icons";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  hiddenOnMobile?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onRowClick?: (row: T) => void;
  selectedRows?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  getRowId?: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  onSort,
  sortKey,
  sortDirection,
  onRowClick,
  selectedRows,
  onSelectRow,
  onSelectAll,
  getRowId = (row) => (row as Record<string, string>).id,
  isLoading,
  emptyMessage = "No data found",
}: DataTableProps<T>) {
  const showCheckbox = !!onSelectRow;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {showCheckbox && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedRows?.size === data.length}
                    onChange={onSelectAll}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3 whitespace-nowrap ${
                    col.sortable ? "cursor-pointer select-none hover:text-slate-700" : ""
                  } ${col.hiddenOnMobile ? "hidden md:table-cell" : ""}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      sortKey === col.key ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {showCheckbox && (
                    <td className="px-4 py-4">
                      <div className="w-4 h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 ${col.hiddenOnMobile ? "hidden md:table-cell" : ""}`}>
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showCheckbox ? 1 : 0)}
                  className="text-center py-12 text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const id = getRowId(row);
                const isSelected = selectedRows?.has(id);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={`transition-colors ${
                      onRowClick ? "cursor-pointer hover:bg-slate-50" : ""
                    } ${isSelected ? "bg-brand-50/50" : ""}`}
                  >
                    {showCheckbox && (
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow?.(id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-6 py-4 text-sm ${col.hiddenOnMobile ? "hidden md:table-cell" : ""}`}
                      >
                        {col.render
                          ? col.render(row)
                          : (row as Record<string, React.ReactNode>)[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

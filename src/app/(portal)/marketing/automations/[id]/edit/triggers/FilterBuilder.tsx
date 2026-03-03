"use client";

import { Plus, Trash2, X } from "lucide-react";
import type {
  TriggerFilters,
  FilterGroup,
  FilterCondition,
  FilterOperator,
  TriggerFilterField,
} from "@/types/marketing";

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  greater_than: "greater than",
  less_than: "less than",
  is_set: "is set",
  is_not_set: "is not set",
  in: "is one of",
  not_in: "is not one of",
};

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

interface FilterBuilderProps {
  filters: TriggerFilters;
  onChange: (filters: TriggerFilters) => void;
  filterFields: TriggerFilterField[];
  dynamicOptions: Record<string, { value: string; label: string }[]>;
}

export function FilterBuilder({ filters, onChange, filterFields, dynamicOptions }: FilterBuilderProps) {
  const groups = filters.groups || [];

  function handleAddGroup() {
    onChange({
      groups: [
        ...groups,
        {
          id: uid(),
          conditions: [
            { id: uid(), field: filterFields[0]?.key || "", operator: "equals", value: "" },
          ],
        },
      ],
    });
  }

  function handleRemoveGroup(groupId: string) {
    onChange({ groups: groups.filter((g) => g.id !== groupId) });
  }

  function handleUpdateGroup(groupId: string, updatedGroup: FilterGroup) {
    onChange({ groups: groups.map((g) => (g.id === groupId ? updatedGroup : g)) });
  }

  function handleAddCondition(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    handleUpdateGroup(groupId, {
      ...group,
      conditions: [
        ...group.conditions,
        { id: uid(), field: filterFields[0]?.key || "", operator: "equals", value: "" },
      ],
    });
  }

  function handleRemoveCondition(groupId: string, conditionId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const updated = group.conditions.filter((c) => c.id !== conditionId);
    if (updated.length === 0) {
      handleRemoveGroup(groupId);
    } else {
      handleUpdateGroup(groupId, { ...group, conditions: updated });
    }
  }

  function handleUpdateCondition(groupId: string, conditionId: string, updates: Partial<FilterCondition>) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    handleUpdateGroup(groupId, {
      ...group,
      conditions: group.conditions.map((c) =>
        c.id === conditionId ? { ...c, ...updates } : c
      ),
    });
  }

  if (groups.length === 0) {
    return (
      <div className="pt-2">
        <button
          onClick={handleAddGroup}
          className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          <Plus className="w-3 h-3" />
          Add filter
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filters</p>
        <button
          onClick={() => onChange({ groups: [] })}
          className="text-[10px] text-slate-400 hover:text-red-500"
        >
          Clear all
        </button>
      </div>

      {groups.map((group, groupIndex) => (
        <div key={group.id}>
          {/* AND connector between groups */}
          {groupIndex > 0 && (
            <div className="flex items-center gap-2 py-1.5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase px-2 bg-white">AND</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          )}

          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
            {group.conditions.map((condition, condIndex) => (
              <div key={condition.id}>
                {/* OR connector within group */}
                {condIndex > 0 && (
                  <div className="flex items-center gap-2 py-1 pl-2">
                    <span className="text-[10px] font-medium text-blue-500 uppercase">OR</span>
                    <div className="flex-1 h-px bg-blue-100" />
                  </div>
                )}

                <ConditionRow
                  condition={condition}
                  filterFields={filterFields}
                  dynamicOptions={dynamicOptions}
                  onUpdate={(updates) => handleUpdateCondition(group.id, condition.id, updates)}
                  onRemove={() => handleRemoveCondition(group.id, condition.id)}
                />
              </div>
            ))}

            <button
              onClick={() => handleAddCondition(group.id)}
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium mt-1"
            >
              <Plus className="w-3 h-3" />
              Add OR condition
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={handleAddGroup}
        className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
      >
        <Plus className="w-3 h-3" />
        Add AND filter group
      </button>

      {/* Plain English summary */}
      {groups.length > 0 && (
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">
          <span className="font-medium">Summary: </span>
          {buildFilterSummary(groups, filterFields, dynamicOptions)}
        </div>
      )}
    </div>
  );
}

function ConditionRow({
  condition,
  filterFields,
  dynamicOptions,
  onUpdate,
  onRemove,
}: {
  condition: FilterCondition;
  filterFields: TriggerFilterField[];
  dynamicOptions: Record<string, { value: string; label: string }[]>;
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
}) {
  const fieldDef = filterFields.find((f) => f.key === condition.field);
  const operators = fieldDef?.operators || ["equals", "not_equals"] as FilterOperator[];
  const isUnary = condition.operator === "is_set" || condition.operator === "is_not_set";

  const options = fieldDef?.dynamicOptionsKey
    ? dynamicOptions[fieldDef.dynamicOptionsKey] || []
    : fieldDef?.options || [];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Field selector */}
      <select
        value={condition.field}
        onChange={(e) => onUpdate({ field: e.target.value, value: "" })}
        className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-[130px]"
      >
        {filterFields.map((f) => (
          <option key={f.key} value={f.key}>{f.label}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={condition.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
        className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {operators.map((op) => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>

      {/* Value */}
      {!isUnary && (
        <>
          {fieldDef?.type === "select" || fieldDef?.type === "multiselect" ? (
            <select
              value={String(condition.value || "")}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-[120px]"
            >
              <option value="">Select...</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : fieldDef?.type === "number" ? (
            <input
              type="number"
              value={(condition.value as number) ?? ""}
              onChange={(e) => onUpdate({ value: e.target.value ? Number(e.target.value) : "" })}
              className="w-24 px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Value"
            />
          ) : (
            <input
              type="text"
              value={String(condition.value || "")}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-[120px]"
              placeholder="Value"
            />
          )}
        </>
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function buildFilterSummary(
  groups: FilterGroup[],
  filterFields: TriggerFilterField[],
  dynamicOptions: Record<string, { value: string; label: string }[]>
): string {
  const groupSummaries = groups.map((group) => {
    const condSummaries = group.conditions.map((c) => {
      const field = filterFields.find((f) => f.key === c.field);
      const fieldLabel = field?.label || c.field;

      if (c.operator === "is_set") return `${fieldLabel} is set`;
      if (c.operator === "is_not_set") return `${fieldLabel} is not set`;

      let valueLabel = String(c.value || "?");
      const opts = field?.dynamicOptionsKey
        ? dynamicOptions[field.dynamicOptionsKey] || []
        : field?.options || [];
      const match = opts.find((o) => o.value === String(c.value));
      if (match) valueLabel = match.label;

      return `${fieldLabel} ${OPERATOR_LABELS[c.operator]} "${valueLabel}"`;
    });

    return condSummaries.join(" OR ");
  });

  return groupSummaries.join(" AND ");
}

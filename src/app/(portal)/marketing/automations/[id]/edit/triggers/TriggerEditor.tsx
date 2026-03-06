"use client";

import { useState, useEffect, useCallback } from "react";
import { useMarketingContext } from "@/lib/marketing-context";
import {
  FileText, UserPlus, UserCog, Building, Building2,
  ShoppingCart, PackageCheck, Ticket, MailOpen, Clock,
  Calendar, Webhook, Zap, ChevronDown, Loader2, Settings2,
  Filter, Copy, ExternalLink,
} from "@/components/icons";
import type {
  TriggerType,
  TriggerDefinition,
  TriggerFilters,
  Automation,
} from "@/types/marketing";
import { TriggerPicker } from "./TriggerPicker";
import { TriggerConfigEditor } from "./TriggerConfigEditor";
import { FilterBuilder } from "./FilterBuilder";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, UserPlus, UserCog, Building, Building2,
  ShoppingCart, PackageCheck, Ticket, MailOpen, Clock,
  Calendar, Webhook, Zap,
};

interface TriggerEditorProps {
  automation: Automation;
  onSave: (fields: Partial<Automation>) => void;
}

export function TriggerEditor({ automation, onSave }: TriggerEditorProps) {
  const { apiBase } = useMarketingContext();
  const [definitions, setDefinitions] = useState<TriggerDefinition[]>([]);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const triggerConfig = (automation.trigger_config || {}) as Record<string, unknown>;
  const triggerFilters: TriggerFilters = automation.trigger_filters || { groups: [] };

  const loadTriggerData = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/automations/triggers`);
      if (res.ok) {
        const data = await res.json();
        setDefinitions(data.definitions || []);
        setDynamicOptions(data.dynamicOptions || {});
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    loadTriggerData();
  }, [loadTriggerData]);

  const currentDef = definitions.find((d) => d.type === automation.trigger_type);
  const Icon = currentDef ? (ICON_MAP[currentDef.icon] || Zap) : Zap;
  const color = currentDef?.color || "text-slate-600";
  const bg = currentDef?.bg || "bg-slate-100";
  const label = currentDef?.label || automation.trigger_type.replace(/_/g, " ");
  const filterCount = triggerFilters.groups?.reduce((sum, g) => sum + g.conditions.length, 0) || 0;

  function handleTriggerTypeChange(type: TriggerType) {
    setShowPicker(false);
    if (type !== automation.trigger_type) {
      onSave({
        trigger_type: type,
        trigger_config: {},
        trigger_filters: { groups: [] },
      } as Partial<Automation>);
    }
  }

  function handleConfigChange(config: Record<string, unknown>) {
    onSave({ trigger_config: config } as Partial<Automation>);
  }

  function handleFiltersChange(filters: TriggerFilters) {
    onSave({ trigger_filters: filters } as Partial<Automation>);
  }

  // Webhook URL for custom_webhook triggers
  const webhookUrl = automation.trigger_type === "custom_webhook"
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${apiBase}/automations/webhook/${automation.id}`
    : null;

  if (loading) {
    return (
      <div className={`rounded-xl border-2 border-dashed ${bg} p-4 flex items-center justify-center`}>
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className={`rounded-xl border-2 border-dashed ${bg} overflow-hidden`}>
        {/* Trigger header */}
        <div
          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-black/5 transition-colors"
          onClick={() => setShowPicker(true)}
        >
          <div className={`w-10 h-10 rounded-lg ${bg} ${color} flex items-center justify-center border border-current/10`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Trigger</p>
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            {currentDef?.description && (
              <p className="text-xs text-slate-500 mt-0.5">{currentDef.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {filterCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-brand-100 text-brand-700 rounded-full">
                <Filter className="w-3 h-3" />
                {filterCount}
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Trigger config */}
        {currentDef?.configFields && currentDef.configFields.length > 0 && (
          <div className="px-4 pb-3 border-t border-black/5">
            <TriggerConfigEditor
              fields={currentDef.configFields}
              config={triggerConfig}
              onChange={handleConfigChange}
              dynamicOptions={dynamicOptions}
            />
          </div>
        )}

        {/* Webhook URL */}
        {webhookUrl && (
          <div className="px-4 pb-3 border-t border-black/5 pt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Webhook URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2.5 py-1.5 text-[11px] bg-white border border-slate-200 rounded text-slate-700 truncate">
                {webhookUrl}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="p-1.5 rounded hover:bg-white text-slate-400 hover:text-slate-600"
                title="Copy URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              POST with {"{"}&quot;email&quot;: &quot;...&quot;{"}"} or {"{"}&quot;contact_id&quot;: &quot;...&quot;{"}"}
            </p>
          </div>
        )}

        {/* Filter toggle + builder */}
        {currentDef?.filterFields && currentDef.filterFields.length > 0 && (
          <div className="px-4 pb-4 border-t border-black/5 pt-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {showFilters ? "Hide filters" : filterCount > 0 ? `Edit filters (${filterCount})` : "Add filters"}
            </button>

            {showFilters && (
              <FilterBuilder
                filters={triggerFilters}
                onChange={handleFiltersChange}
                filterFields={currentDef.filterFields}
                dynamicOptions={dynamicOptions}
              />
            )}
          </div>
        )}
      </div>

      {/* Trigger picker modal */}
      {showPicker && (
        <TriggerPicker
          definitions={definitions}
          currentType={automation.trigger_type}
          onSelect={handleTriggerTypeChange}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

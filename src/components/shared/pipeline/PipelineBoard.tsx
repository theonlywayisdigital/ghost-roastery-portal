"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { Loader2, List, LayoutGrid, Plus, X, Building2, User, Settings } from "@/components/icons";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineCard, type PipelineItem } from "./PipelineCard";
import { PipelineList } from "./PipelineList";
import type { PipelineStage } from "@/lib/pipeline";

interface PipelineBoardProps {
  apiBase: string;
  detailBase: string;
  businessDetailBase: string;
}

export function PipelineBoard({ apiBase, detailBase, businessDetailBase }: PipelineBoardProps) {
  const router = useRouter();
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<PipelineItem | null>(null);
  const [view, setView] = useState<"board" | "list">("board");

  // Add Deal modal state
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [dealType, setDealType] = useState<"contact" | "business">("contact");
  const [dealForm, setDealForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    business_name: "",
    // Business-specific fields
    name: "",
    industry: "",
  });
  const [creatingDeal, setCreatingDeal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadPipeline = useCallback(async () => {
    try {
      const [pipelineRes, stagesRes] = await Promise.all([
        fetch(`${apiBase}/pipeline`),
        fetch("/api/pipeline-stages"),
      ]);

      if (pipelineRes.ok) {
        const data = await pipelineRes.json();
        setItems(data.items || []);
      }
      if (stagesRes.ok) {
        const data = await stagesRes.json();
        setStages(data.stages || []);
      }
    } catch (err) {
      console.error("Failed to load pipeline:", err);
    }
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    loadPipeline();
  }, [loadPipeline]);

  // Derive first non-loss stage slug for default lead_status
  const defaultStageSlug = stages.find((s) => !s.is_loss)?.slug || "lead";

  function getItemsByStage(stage: string): PipelineItem[] {
    return items.filter((item) => (item.leadStatus || defaultStageSlug) === stage);
  }

  function handleClickItem(item: PipelineItem) {
    if (item.itemType === "business") {
      router.push(`${businessDetailBase}/${item.id}`);
    } else {
      router.push(`${detailBase}/${item.id}`);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const dragId = event.active.id as string;
    const [itemType, id] = dragId.split(/-(.+)/);
    const item = items.find((i) => i.id === id && i.itemType === itemType);
    setActiveItem(item || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const dragId = active.id as string;
    const [itemType, id] = dragId.split(/-(.+)/);
    const targetStage = over.id as string;

    const item = items.find((i) => i.id === id && i.itemType === itemType);
    if (!item) return;

    // Don't update if same stage
    if (item.leadStatus === targetStage) return;

    // Check if target stage is a win stage
    const targetStageObj = stages.find((s) => s.slug === targetStage);
    const isWinStage = targetStageObj?.is_win ?? false;

    // Optimistic update
    const prevItems = [...items];
    setItems((prev) =>
      prev.map((i) =>
        i.id === id && i.itemType === itemType
          ? { ...i, leadStatus: targetStage }
          : i
      )
    );

    try {
      // Determine the API endpoint
      const endpoint = item.itemType === "business"
        ? `${apiBase.replace("/contacts", "/businesses")}/${id}`
        : `${apiBase}/${id}`;

      // Build the update body
      const body: Record<string, unknown> = { lead_status: targetStage };

      // If moving to a win stage, add "customer" to types if not already present
      if (isWinStage && !item.types.includes("customer")) {
        body.types = [...item.types, "customer"];
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setItems(prevItems); // Revert on failure
      } else if (isWinStage && !item.types.includes("customer")) {
        // Update local types too
        setItems((prev) =>
          prev.map((i) =>
            i.id === id && i.itemType === itemType
              ? { ...i, types: [...i.types, "customer"] }
              : i
          )
        );
      }
    } catch {
      setItems(prevItems); // Revert on failure
    }
  }

  async function handleDeleteItem(item: PipelineItem) {
    // Optimistic removal
    const prevItems = [...items];
    setItems((prev) => prev.filter((i) => !(i.id === item.id && i.itemType === item.itemType)));

    try {
      const endpoint = item.itemType === "business"
        ? `${apiBase.replace("/contacts", "/businesses")}/${item.id}`
        : `${apiBase}/${item.id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        setItems(prevItems); // Revert on failure
      }
    } catch {
      setItems(prevItems); // Revert on failure
    }
  }

  function resetDealForm() {
    setDealForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      business_name: "",
      name: "",
      industry: "",
    });
    setDealType("contact");
  }

  async function handleCreateDeal() {
    setCreatingDeal(true);
    try {
      if (dealType === "contact") {
        const res = await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: dealForm.first_name.trim(),
            last_name: dealForm.last_name.trim(),
            email: dealForm.email.trim() || null,
            phone: dealForm.phone.trim() || null,
            business_name: dealForm.business_name.trim() || null,
            types: ["lead"],
            lead_status: defaultStageSlug,
            source: "pipeline",
          }),
        });
        if (res.ok) {
          setShowAddDeal(false);
          resetDealForm();
          loadPipeline();
        }
      } else {
        const businessApi = apiBase.replace("/contacts", "/businesses");
        const res = await fetch(businessApi, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: dealForm.name.trim(),
            email: dealForm.email.trim() || null,
            phone: dealForm.phone.trim() || null,
            industry: dealForm.industry.trim() || null,
            types: ["lead"],
            lead_status: defaultStageSlug,
            source: "pipeline",
          }),
        });
        if (res.ok) {
          setShowAddDeal(false);
          resetDealForm();
          loadPipeline();
        }
      }
    } catch {
      // ignore
    }
    setCreatingDeal(false);
  }

  const canCreateDeal = dealType === "contact"
    ? dealForm.first_name.trim() || dealForm.last_name.trim()
    : dealForm.name.trim();

  // Count totals
  const total = items.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          {total} {total === 1 ? "lead" : "leads"} in pipeline
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/settings/pipeline-stages"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Manage Stages
          </Link>
          <button
            onClick={() => {
              resetDealForm();
              setShowAddDeal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Deal
          </button>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "board"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <PipelineList
          items={items}
          detailBase={detailBase}
          businessDetailBase={businessDetailBase}
          isLoading={false}
          onDelete={handleDeleteItem}
        />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <PipelineColumn
                key={stage.slug}
                stage={stage.slug}
                label={stage.name}
                colour={stage.colour}
                items={getItemsByStage(stage.slug)}
                onClickItem={handleClickItem}
                onDeleteItem={handleDeleteItem}
              />
            ))}
          </div>

          <DragOverlay>
            {activeItem && (
              <div className="w-[264px]">
                <PipelineCard
                  item={activeItem}
                  onClick={() => {}}
                  overlay
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add Deal Modal */}
      {showAddDeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Deal</h3>
              <button
                onClick={() => setShowAddDeal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setDealType("contact")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  dealType === "contact"
                    ? "bg-brand-50 border-brand-300 text-brand-700"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <User className="w-4 h-4" />
                Contact
              </button>
              <button
                onClick={() => setDealType("business")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  dealType === "business"
                    ? "bg-brand-50 border-brand-300 text-brand-700"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Business
              </button>
            </div>

            <div className="space-y-4">
              {dealType === "contact" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={dealForm.first_name}
                        onChange={(e) => setDealForm((f) => ({ ...f, first_name: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={dealForm.last_name}
                        onChange={(e) => setDealForm((f) => ({ ...f, last_name: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={dealForm.email}
                      onChange={(e) => setDealForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={dealForm.phone}
                        onChange={(e) => setDealForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Business</label>
                      <input
                        type="text"
                        value={dealForm.business_name}
                        onChange={(e) => setDealForm((f) => ({ ...f, business_name: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={dealForm.name}
                      onChange={(e) => setDealForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Acme Coffee Co."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={dealForm.email}
                      onChange={(e) => setDealForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="info@acmecoffee.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={dealForm.phone}
                        onChange={(e) => setDealForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                      <select
                        value={dealForm.industry}
                        onChange={(e) => setDealForm((f) => ({ ...f, industry: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Select industry</option>
                        <option value="cafe">Cafe</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="gym">Gym</option>
                        <option value="hotel">Hotel</option>
                        <option value="office">Office</option>
                        <option value="coworking">Coworking</option>
                        <option value="events">Events</option>
                        <option value="retail">Retail</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-4">
              {`Lead will be added to the "${stages.find((s) => s.slug === defaultStageSlug)?.name || "first"}" stage.`}
            </p>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddDeal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDeal}
                disabled={creatingDeal || !canCreateDeal}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {creatingDeal ? "Creating..." : "Create Deal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

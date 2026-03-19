"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Loader2, List, LayoutGrid, Plus, X, Building2, User, Settings, Search, ChevronDown, ChevronRight } from "@/components/icons";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineCard, type PipelineItem } from "./PipelineCard";
import { PipelineList } from "./PipelineList";
import type { PipelineStage } from "@/lib/pipeline";

interface ContactResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  business_name: string | null;
  business_id: string | null;
  businesses: { id: string; name: string } | null;
  types: string[];
}

interface BusinessResult {
  id: string;
  name: string;
  industry: string | null;
  email: string | null;
}

interface PipelineBoardProps {
  apiBase: string;
  detailBase: string;
  businessDetailBase: string;
  stagesSettingsHref?: string;
  stagesApiBase?: string;
}

export function PipelineBoard({ apiBase, detailBase, businessDetailBase, stagesSettingsHref, stagesApiBase = "/api/pipeline-stages" }: PipelineBoardProps) {
  const router = useRouter();
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<PipelineItem | null>(null);
  const [view, setView] = useState<"board" | "list">("board");

  // Add Deal modal state
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [creatingDeal, setCreatingDeal] = useState(false);

  // Contact search
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<ContactResult[]>([]);
  const [contactSearching, setContactSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null);
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact, setNewContact] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const contactDebounce = useRef<ReturnType<typeof setTimeout>>();

  // Business search
  const [showBusinessSection, setShowBusinessSection] = useState(false);
  const [businessQuery, setBusinessQuery] = useState("");
  const [businessResults, setBusinessResults] = useState<BusinessResult[]>([]);
  const [businessSearching, setBusinessSearching] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null);
  const [businessLocked, setBusinessLocked] = useState(false);
  const [showNewBusiness, setShowNewBusiness] = useState(false);
  const [newBusiness, setNewBusiness] = useState({ name: "", industry: "", website: "" });
  const businessDebounce = useRef<ReturnType<typeof setTimeout>>();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadPipeline = useCallback(async () => {
    try {
      const [pipelineRes, stagesRes] = await Promise.all([
        fetch(`${apiBase}/pipeline`),
        fetch(stagesApiBase),
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
  }, [apiBase, stagesApiBase]);

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

      // If moving to a win stage, add "wholesale" to types if not already present
      if (isWinStage && !item.types.includes("wholesale")) {
        body.types = [...item.types, "wholesale"];
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setItems(prevItems); // Revert on failure
      } else if (isWinStage && !item.types.includes("wholesale")) {
        // Update local types too
        setItems((prev) =>
          prev.map((i) =>
            i.id === id && i.itemType === itemType
              ? { ...i, types: [...i.types, "wholesale"] }
              : i
          )
        );
      }
    } catch {
      setItems(prevItems); // Revert on failure
    }
  }

  async function handleDeleteItem(item: PipelineItem) {
    // Optimistic removal — clears lead_status (removes from pipeline without archiving)
    const prevItems = [...items];
    setItems((prev) => prev.filter((i) => !(i.id === item.id && i.itemType === item.itemType)));

    try {
      const endpoint = item.itemType === "business"
        ? `${apiBase.replace("/contacts", "/businesses")}/${item.id}`
        : `${apiBase}/${item.id}`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_status: null }),
      });
      if (!res.ok) {
        setItems(prevItems); // Revert on failure
      }
    } catch (err) {
      console.error("Failed to remove from pipeline:", err);
      setItems(prevItems); // Revert on failure
    }
  }

  function resetDealModal() {
    setContactQuery("");
    setContactResults([]);
    setSelectedContact(null);
    setShowNewContact(false);
    setNewContact({ first_name: "", last_name: "", email: "", phone: "" });
    setBusinessQuery("");
    setBusinessResults([]);
    setSelectedBusiness(null);
    setBusinessLocked(false);
    setShowBusinessSection(false);
    setShowNewBusiness(false);
    setNewBusiness({ name: "", industry: "", website: "" });
  }

  function handleContactSearch(query: string) {
    setContactQuery(query);
    setShowNewContact(false);
    if (contactDebounce.current) clearTimeout(contactDebounce.current);
    if (!query.trim()) {
      setContactResults([]);
      return;
    }
    contactDebounce.current = setTimeout(async () => {
      setContactSearching(true);
      try {
        const res = await fetch(`${apiBase}?search=${encodeURIComponent(query.trim())}&status=all&page=1`);
        if (res.ok) {
          const data = await res.json();
          setContactResults((data.contacts || []).slice(0, 5));
        }
      } catch (err) {
        console.error("Contact search failed:", err);
      }
      setContactSearching(false);
    }, 300);
  }

  function handleSelectContact(contact: ContactResult) {
    setSelectedContact(contact);
    setContactQuery("");
    setContactResults([]);
    setShowNewContact(false);
    // Auto-populate business if contact has one
    if (contact.businesses) {
      setSelectedBusiness({ id: contact.businesses.id, name: contact.businesses.name, industry: null, email: null });
      setBusinessLocked(true);
      setShowBusinessSection(true);
    } else {
      setSelectedBusiness(null);
      setBusinessLocked(false);
    }
  }

  function handleClearContact() {
    setSelectedContact(null);
    setContactQuery("");
    // Also clear business if it was auto-populated
    if (businessLocked) {
      setSelectedBusiness(null);
      setBusinessLocked(false);
      setShowBusinessSection(false);
    }
  }

  function handleBusinessSearch(query: string) {
    setBusinessQuery(query);
    setShowNewBusiness(false);
    if (businessDebounce.current) clearTimeout(businessDebounce.current);
    if (!query.trim()) {
      setBusinessResults([]);
      return;
    }
    const businessApi = apiBase.replace("/contacts", "/businesses");
    businessDebounce.current = setTimeout(async () => {
      setBusinessSearching(true);
      try {
        const res = await fetch(`${businessApi}?search=${encodeURIComponent(query.trim())}&status=all&page=1`);
        if (res.ok) {
          const data = await res.json();
          setBusinessResults((data.businesses || []).slice(0, 5));
        }
      } catch (err) {
        console.error("Business search failed:", err);
      }
      setBusinessSearching(false);
    }, 300);
  }

  function handleSelectBusiness(biz: BusinessResult) {
    setSelectedBusiness(biz);
    setBusinessQuery("");
    setBusinessResults([]);
    setShowNewBusiness(false);
  }

  function handleClearBusiness() {
    setSelectedBusiness(null);
    setBusinessLocked(false);
    setBusinessQuery("");
    setShowNewBusiness(false);
  }

  async function handleCreateDeal() {
    setCreatingDeal(true);
    const businessApi = apiBase.replace("/contacts", "/businesses");
    try {
      if (selectedContact) {
        // --- Existing contact ---

        // Duplicate detection: check if already in pipeline
        const alreadyInPipeline = items.some(
          (i) => i.id === selectedContact.id && i.itemType === "contact"
        );
        if (alreadyInPipeline) {
          alert("This contact is already in the pipeline.");
          setCreatingDeal(false);
          return;
        }

        // Build a single update body to avoid double PUT
        const contactTypes = [...(selectedContact.types || [])];
        if (!contactTypes.includes("lead")) contactTypes.push("lead");
        const contactBody: Record<string, unknown> = { lead_status: defaultStageSlug, types: contactTypes };
        if (selectedBusiness && !selectedContact.business_id) {
          contactBody.business_id = selectedBusiness.id;
        }

        await fetch(`${apiBase}/${selectedContact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactBody),
        });

        // Update business lead_status too if one is selected (preserve existing types)
        if (selectedBusiness) {
          const existingBizItem = items.find(
            (i) => i.id === selectedBusiness.id && i.itemType === "business"
          );
          const bizTypes = [...(existingBizItem?.types || [])];
          if (!bizTypes.includes("lead")) bizTypes.push("lead");

          await fetch(`${businessApi}/${selectedBusiness.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lead_status: defaultStageSlug, types: bizTypes }),
          });
        }

        setShowAddDeal(false);
        resetDealModal();
        loadPipeline();
      } else if (showNewContact && newContact.first_name.trim()) {
        // --- New contact ---
        let businessId: string | null = null;

        // Create new business first if needed
        if (showNewBusiness && newBusiness.name.trim()) {
          const bizRes = await fetch(businessApi, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newBusiness.name.trim(),
              industry: newBusiness.industry || null,
              website: newBusiness.website.trim() || null,
              types: ["lead"],
              lead_status: defaultStageSlug,
              source: "pipeline",
            }),
          });
          if (bizRes.ok) {
            const bizData = await bizRes.json();
            businessId = bizData.business?.id || null;
          }
        } else if (selectedBusiness) {
          businessId = selectedBusiness.id;
          // Also update existing business lead_status (preserve existing types)
          const existingBizItem = items.find(
            (i) => i.id === selectedBusiness.id && i.itemType === "business"
          );
          const bizTypes = [...(existingBizItem?.types || [])];
          if (!bizTypes.includes("lead")) bizTypes.push("lead");

          await fetch(`${businessApi}/${selectedBusiness.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lead_status: defaultStageSlug, types: bizTypes }),
          });
        }

        const contactRes = await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: newContact.first_name.trim(),
            last_name: newContact.last_name.trim(),
            email: newContact.email.trim() || null,
            phone: newContact.phone.trim() || null,
            business_id: businessId,
            types: ["lead"],
            lead_status: defaultStageSlug,
            source: "pipeline",
          }),
        });

        if (contactRes.ok) {
          setShowAddDeal(false);
          resetDealModal();
          loadPipeline();
        }
      }
    } catch (err) {
      console.error("Failed to create deal:", err);
    }
    setCreatingDeal(false);
  }

  const canCreateDeal = selectedContact || (showNewContact && newContact.first_name.trim());

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
          {stagesSettingsHref && (
            <Link
              href={stagesSettingsHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Manage Stages
            </Link>
          )}
          <button
            onClick={() => {
              resetDealModal();
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
          stages={stages}
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
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Add Deal</h3>
              <button
                onClick={() => setShowAddDeal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECTION 1 — Contact (required) */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contact <span className="text-red-500">*</span>
              </label>

              {selectedContact ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-200 rounded-lg text-sm">
                  <User className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-brand-700 font-medium">
                    {`${selectedContact.first_name} ${selectedContact.last_name}`.trim()}
                  </span>
                  {selectedContact.email && (
                    <span className="text-brand-500">{selectedContact.email}</span>
                  )}
                  <button
                    onClick={handleClearContact}
                    className="text-brand-400 hover:text-brand-600 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : showNewContact ? (
                <div className="space-y-3 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">New Contact</p>
                    <button
                      onClick={() => setShowNewContact(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newContact.first_name}
                        onChange={(e) => setNewContact((f) => ({ ...f, first_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="John"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={newContact.last_name}
                        onChange={(e) => setNewContact((f) => ({ ...f, last_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={newContact.phone}
                      onChange={(e) => setNewContact((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={contactQuery}
                      onChange={(e) => handleContactSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Search contacts by name or email..."
                      autoFocus
                    />
                    {contactSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                    )}
                  </div>

                  {/* Search results dropdown */}
                  {contactQuery.trim() && !contactSearching && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {contactResults.length > 0 ? (
                        contactResults.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleSelectContact(c)}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                          >
                            <p className="text-sm font-medium text-slate-900">
                              {`${c.first_name} ${c.last_name}`.trim()}
                            </p>
                            <p className="text-xs text-slate-500">
                              {[c.email, c.business_name].filter(Boolean).join(" · ")}
                            </p>
                          </button>
                        ))
                      ) : null}
                      <button
                        onClick={() => {
                          setShowNewContact(true);
                          setNewContact((f) => ({ ...f, first_name: contactQuery.trim() }));
                          setContactQuery("");
                          setContactResults([]);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-sm text-brand-600 font-medium flex items-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {`Create new contact${contactQuery.trim() ? ` "${contactQuery.trim()}"` : ""}`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2 — Business (optional) */}
            <div className="mb-5">
              {!showBusinessSection && !selectedBusiness ? (
                <button
                  onClick={() => setShowBusinessSection(true)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  Add Business (optional)
                </button>
              ) : (
                <div>
                  <button
                    onClick={() => {
                      if (!businessLocked) {
                        setShowBusinessSection(false);
                        setSelectedBusiness(null);
                        setBusinessQuery("");
                        setBusinessResults([]);
                        setShowNewBusiness(false);
                        setNewBusiness({ name: "", industry: "", website: "" });
                      }
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Business
                    <span className="text-slate-400 font-normal text-xs">(optional)</span>
                  </button>

                  {selectedBusiness ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-700 font-medium">{selectedBusiness.name}</span>
                      {businessLocked && (
                        <span className="text-xs text-slate-400">(linked)</span>
                      )}
                      <button
                        onClick={handleClearBusiness}
                        className="text-slate-400 hover:text-slate-600 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : showNewBusiness ? (
                    <div className="space-y-3 border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">New Business</p>
                        <button
                          onClick={() => setShowNewBusiness(false)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Business Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newBusiness.name}
                          onChange={(e) => setNewBusiness((f) => ({ ...f, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          placeholder="Acme Coffee Co."
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Industry</label>
                          <select
                            value={newBusiness.industry}
                            onChange={(e) => setNewBusiness((f) => ({ ...f, industry: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
                          <input
                            type="text"
                            value={newBusiness.website}
                            onChange={(e) => setNewBusiness((f) => ({ ...f, website: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="acmecoffee.com"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={businessQuery}
                          onChange={(e) => handleBusinessSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          placeholder="Search businesses..."
                        />
                        {businessSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                        )}
                      </div>

                      {businessQuery.trim() && !businessSearching && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                          {businessResults.length > 0 ? (
                            businessResults.map((b) => (
                              <button
                                key={b.id}
                                onClick={() => handleSelectBusiness(b)}
                                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                              >
                                <p className="text-sm font-medium text-slate-900">{b.name}</p>
                                {b.industry && (
                                  <p className="text-xs text-slate-500">{b.industry}</p>
                                )}
                              </button>
                            ))
                          ) : null}
                          <button
                            onClick={() => {
                              setShowNewBusiness(true);
                              setNewBusiness((f) => ({ ...f, name: businessQuery.trim() }));
                              setBusinessQuery("");
                              setBusinessResults([]);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-sm text-brand-600 font-medium flex items-center gap-2"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {`Create new business${businessQuery.trim() ? ` "${businessQuery.trim()}"` : ""}`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400">
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

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Store,
  Eye,
  EyeOff,
  Loader2,
  Download,
  Upload,
  Package,
  Check,
  Link2,
  CreditCard,
  ArrowRight,
  Landmark,
  Plus,
  Trash2,
  Pencil,
  X,
  Copy,
  Zap,
  Lock,
} from "lucide-react";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";
import { SocialConnectionsTab } from "./SocialConnectionsTab";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { type FeatureKey, getMinimumTierForFeature } from "@/lib/tier-config";

interface AccountOption {
  code?: string;
  name?: string;
  type?: string;
  rate?: number;
  id?: string;
}

interface EcommerceStatus {
  connected: boolean;
  connection_id?: string;
  is_active?: boolean;
  store_url?: string;
  shop_name?: string;
  sync_products?: boolean;
  sync_orders?: boolean;
  sync_stock?: boolean;
  last_product_sync_at?: string | null;
  last_order_sync_at?: string | null;
  last_stock_sync_at?: string | null;
  connected_at?: string | null;
  webhook_ids?: Record<string, string>;
  has_write_access?: boolean | null;
  store_page_id?: string | null;
}

interface PreviewProduct {
  external_id: string;
  name: string;
  image_url: string | null;
  price: string | null;
  sku: string | null;
  variant_count: number;
  status: string;
  already_imported: boolean;
  mapped_product_id: string | null;
  option_names: string[];
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors?: string[];
  total: number;
}

interface ExportableProduct {
  id: string;
  name: string;
  image_url: string | null;
  retail_price: number | null;
  sku: string | null;
  variant_count: number;
  status: string;
}

interface ExportResult {
  exported: number;
  errors?: string[];
  total: number;
}

type IntegrationsTab = "payments" | "accounting" | "ecommerce" | "webhooks" | "social";

interface StripeStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  external_accounts: { id: string; last4: string | null; bank_name: string | null; type: string }[];
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    errors: { code: string; reason: string; requirement: string }[];
  } | null;
}

interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: string[] | null;
  is_active: boolean;
  created_at: string;
}

const WEBHOOK_EVENT_LABELS: Record<string, string> = {
  "invoice.created": "Invoice Created",
  "invoice.paid": "Invoice Paid",
  "order.placed": "Order Placed",
  "order.cancelled": "Order Cancelled",
  "buyer.approved": "Buyer Approved",
  "contact.created": "Contact Created",
};

interface IntegrationStatus {
  connected: boolean;
  is_active?: boolean;
  tenant_name?: string | null;
  auto_sync?: boolean;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  error?: string | null;
  connected_at?: string | null;
  // Xero account settings
  sales_account_code?: string | null;
  sales_tax_type?: string | null;
  available_accounts?: AccountOption[] | null;
  available_tax_types?: AccountOption[] | null;
  // Sage account settings
  sales_ledger_account_id?: string | null;
  sales_tax_rate_id?: string | null;
  available_ledger_accounts?: AccountOption[] | null;
  available_tax_rates?: AccountOption[] | null;
  // QuickBooks account settings
  sales_item_id?: string | null;
  sales_tax_code_id?: string | null;
  available_items?: AccountOption[] | null;
  available_tax_codes?: AccountOption[] | null;
}

export function IntegrationsPage() {
  // Tab routing via URL search params
  const initialTab = typeof window !== "undefined"
    ? (new URLSearchParams(window.location.search).get("tab") as IntegrationsTab) || "accounting"
    : "accounting";
  const [activeTab, setActiveTab] = useState<IntegrationsTab>(initialTab);

  function switchTab(tab: IntegrationsTab) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }

  // Stripe Connect state
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(true);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(true);
  const [whShowForm, setWhShowForm] = useState(false);
  const [whEditingId, setWhEditingId] = useState<string | null>(null);
  const [whUrl, setWhUrl] = useState("");
  const [whSelectedEvents, setWhSelectedEvents] = useState<string[]>([]);
  const [whAllEvents, setWhAllEvents] = useState(true);
  const [whSaving, setWhSaving] = useState(false);
  const [whError, setWhError] = useState<string | null>(null);
  const [whCopiedId, setWhCopiedId] = useState<string | null>(null);
  const [whTestingId, setWhTestingId] = useState<string | null>(null);
  const [whTestResult, setWhTestResult] = useState<{
    id: string;
    success: boolean;
    message: string;
  } | null>(null);

  // Accounting/Ecommerce state
  const [xeroStatus, setXeroStatus] = useState<IntegrationStatus | null>(null);
  const [sageStatus, setSageStatus] = useState<IntegrationStatus | null>(null);
  const [quickbooksStatus, setQuickbooksStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [testSyncLoading, setTestSyncLoading] = useState<string | null>(null);
  const [testSyncResult, setTestSyncResult] = useState<Record<string, unknown> | null>(null);
  const [testSyncProvider, setTestSyncProvider] = useState<string | null>(null);

  // Ecommerce integration state
  const [shopifyStatus, setShopifyStatus] = useState<EcommerceStatus | null>(null);
  const [sqStatus, setSqStatus] = useState<EcommerceStatus | null>(null);
  const [ecomDisconnecting, setEcomDisconnecting] = useState<string | null>(null);
  const [ecomToggling, setEcomToggling] = useState<string | null>(null);

  // Shopify connect
  const [shopifyShopUrl, setShopifyShopUrl] = useState("");
  const [showShopifyInput, setShowShopifyInput] = useState(false);

  // Squarespace connect form
  const [showSqForm, setShowSqForm] = useState(false);
  const [sqApiKey, setSqApiKey] = useState("");
  const [sqShowKey, setSqShowKey] = useState(false);
  const [sqConnecting, setSqConnecting] = useState(false);
  const [sqError, setSqError] = useState<string | null>(null);

  // Squarespace store page selection
  const [sqStorePages, setSqStorePages] = useState<{ id: string; title: string; isEnabled: boolean }[]>([]);
  const [sqStorePagesLoading, setSqStorePagesLoading] = useState(false);
  const [sqSavingStorePage, setSqSavingStorePage] = useState(false);

  // Import modal state
  const [importModalProvider, setImportModalProvider] = useState<"shopify" | "squarespace" | null>(null);
  const [importConnectionId, setImportConnectionId] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProducts, setImportProducts] = useState<PreviewProduct[]>([]);
  const [importSelected, setImportSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [unmappedCount, setUnmappedCount] = useState(0);
  const [importStep, setImportStep] = useState<"select" | "mapping" | "importing">("select");
  const [importIsCoffee, setImportIsCoffee] = useState(true);
  const [importWeightAttribute, setImportWeightAttribute] = useState<string | null>(null);

  // Export modal state
  const [exportModalProvider, setExportModalProvider] = useState<"shopify" | "squarespace" | null>(null);
  const [exportConnectionId, setExportConnectionId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProducts, setExportProducts] = useState<ExportableProduct[]>([]);
  const [exportSelected, setExportSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  // Webhook registration state
  const [registeringWebhooks, setRegisteringWebhooks] = useState<string | null>(null);

  // Feature gate state
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);

  // Derived locks
  const accountingLocked = features ? !features.integrationsAccounting : false;
  const ecommerceLocked = features ? !features.integrationsEcommerce : false;
  const socialLocked = features ? !features.integrationsSocial : false;

  const loadStatus = useCallback(async () => {
    try {
      const [xeroRes, sageRes, qbRes, shopifyRes, sqRes, stripeRes] = await Promise.all([
        fetch("/api/integrations/xero/status"),
        fetch("/api/integrations/sage/status"),
        fetch("/api/integrations/quickbooks/status"),
        fetch("/api/integrations/shopify/status"),
        fetch("/api/integrations/squarespace/status"),
        fetch("/api/wholesale-portal/stripe/status"),
      ]);
      const [xeroData, sageData, qbData, shopifyData, sqData, stripeData] = await Promise.all([
        xeroRes.json(),
        sageRes.json(),
        qbRes.json(),
        shopifyRes.json(),
        sqRes.json(),
        stripeRes.json(),
      ]);
      setXeroStatus(xeroData);
      setSageStatus(sageData);
      setQuickbooksStatus(qbData);
      setShopifyStatus(shopifyData);
      setSqStatus(sqData);
      setStripeStatus(stripeData);
      setStripeLoading(false);

      // Fetch unmapped count if any ecommerce connection exists
      if (shopifyData.connected || sqData.connected) {
        try {
          const mappingsRes = await fetch(
            "/api/integrations/ecommerce/product-mappings"
          );
          const mappingsData = await mappingsRes.json();
          setUnmappedCount(mappingsData.unmapped_count || 0);
        } catch {
          // Non-critical
        }
      }

      // Fetch feature gates
      try {
        const usageRes = await fetch("/api/usage");
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          setFeatures(usageData.features || null);
        }
      } catch {
        // Non-critical — fail open (features remain null = unlocked)
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Check URL params for success/error from OAuth callback
    const params = new URLSearchParams(window.location.search);
    const successParam = params.get("success");
    if (successParam === "xero") {
      setSuccessMessage("Xero connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else if (successParam === "sage") {
      setSuccessMessage("Sage connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else if (successParam === "quickbooks") {
      setSuccessMessage("QuickBooks connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else if (successParam === "shopify") {
      setSuccessMessage("Shopify connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSuccessMessage(null), 5000);
    }

    if (params.get("error")) {
      const errorMap: Record<string, string> = {
        unauthorized: "You must be logged in as a roaster to connect.",
        missing_code: "OAuth flow was interrupted. Please try again.",
        invalid_state: "Invalid OAuth state. Please try again.",
        state_mismatch: "Security check failed. Please try again.",
        no_organisation:
          "No organisation found. Make sure you have an account.",
        save_failed: "Failed to save the connection. Please try again.",
        oauth_failed: "OAuth authentication failed. Please try again.",
      };
      const errorCode = params.get("error") || "";
      setSuccessMessage(null);
      // Show error on the appropriate provider or generically
      const errorMsg = errorMap[errorCode] || `Error: ${errorCode}`;
      setXeroStatus((prev) =>
        prev
          ? { ...prev, error: prev.connected ? prev.error : errorMsg }
          : { connected: false, error: errorMsg }
      );
      window.history.replaceState({}, "", window.location.pathname);
    }

    // Check for Stripe return params
    const stripeParam = params.get("stripe");
    if (stripeParam === "complete" || stripeParam === "refresh") {
      switchTab("payments");
      if (stripeParam === "complete") {
        setSuccessMessage("Stripe Connect setup updated successfully!");
        setTimeout(() => setSuccessMessage(null), 5000);
      }
      // Clean up the stripe param but keep tab
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("stripe");
      cleanUrl.searchParams.set("tab", "payments");
      window.history.replaceState({}, "", cleanUrl.toString());
    }
  }, [loadStatus]);

  // Auto-load Squarespace store pages when connected but no store page selected
  useEffect(() => {
    if (sqStatus?.connected && !sqStatus.store_page_id && sqStorePages.length === 0 && !sqStorePagesLoading) {
      handleLoadSqStorePages(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqStatus?.connected, sqStatus?.store_page_id]);

  // Load webhooks when tab is active
  useEffect(() => {
    if (activeTab === "webhooks" && webhooksLoading) {
      loadWebhooks();
    }
  }, [activeTab, webhooksLoading]);

  async function loadWebhooks() {
    try {
      const res = await fetch("/api/settings/webhooks");
      const data = await res.json();
      setWebhooks(data.webhooks || []);
    } finally {
      setWebhooksLoading(false);
    }
  }

  // ─── Stripe Connect handlers ───

  async function handleStripeConnect() {
    setStripeConnecting(true);
    try {
      const res = await fetch("/api/wholesale-portal/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnPath: "/settings/integrations?tab=payments&stripe=complete",
          refreshPath: "/settings/integrations?tab=payments&stripe=refresh",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to start Stripe Connect:", error);
      setStripeConnecting(false);
    }
  }

  // ─── Webhooks handlers ───

  function whOpenAddForm() {
    setWhEditingId(null);
    setWhUrl("");
    setWhSelectedEvents([]);
    setWhAllEvents(true);
    setWhError(null);
    setWhShowForm(true);
  }

  function whOpenEditForm(wh: Webhook) {
    setWhEditingId(wh.id);
    setWhUrl(wh.url);
    if (wh.events && wh.events.length > 0) {
      setWhSelectedEvents(wh.events);
      setWhAllEvents(false);
    } else {
      setWhSelectedEvents([]);
      setWhAllEvents(true);
    }
    setWhError(null);
    setWhShowForm(true);
  }

  function whCloseForm() {
    setWhShowForm(false);
    setWhEditingId(null);
    setWhUrl("");
    setWhSelectedEvents([]);
    setWhAllEvents(true);
    setWhError(null);
  }

  function whToggleEvent(event: string) {
    setWhSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  }

  async function whHandleSave() {
    if (!whUrl) {
      setWhError("URL is required");
      return;
    }
    try {
      new URL(whUrl);
    } catch {
      setWhError("Please enter a valid URL");
      return;
    }
    setWhSaving(true);
    setWhError(null);
    const events = whAllEvents ? null : whSelectedEvents;
    try {
      if (whEditingId) {
        const res = await fetch(`/api/settings/webhooks/${whEditingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: whUrl, events }),
        });
        if (!res.ok) {
          const data = await res.json();
          setWhError(data.error || "Failed to update");
          return;
        }
        const data = await res.json();
        setWebhooks((prev) =>
          prev.map((w) => (w.id === whEditingId ? data.webhook : w))
        );
      } else {
        const res = await fetch("/api/settings/webhooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: whUrl, events }),
        });
        if (!res.ok) {
          const data = await res.json();
          setWhError(data.error || "Failed to create");
          return;
        }
        const data = await res.json();
        setWebhooks((prev) => [...prev, data.webhook]);
      }
      whCloseForm();
    } catch {
      setWhError("Something went wrong");
    } finally {
      setWhSaving(false);
    }
  }

  async function whHandleDelete(id: string) {
    if (!confirm("Delete this webhook?")) return;
    await fetch(`/api/settings/webhooks/${id}`, { method: "DELETE" });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  async function whHandleToggleActive(wh: Webhook) {
    const res = await fetch(`/api/settings/webhooks/${wh.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !wh.is_active }),
    });
    if (res.ok) {
      const data = await res.json();
      setWebhooks((prev) =>
        prev.map((w) => (w.id === wh.id ? data.webhook : w))
      );
    }
  }

  async function whHandleTest(id: string) {
    setWhTestingId(id);
    setWhTestResult(null);
    try {
      const res = await fetch(`/api/settings/webhooks/${id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setWhTestResult({
        id,
        success: data.success,
        message: data.success
          ? `OK (${data.status} ${data.statusText})`
          : data.error || "Failed",
      });
    } catch {
      setWhTestResult({ id, success: false, message: "Request failed" });
    } finally {
      setWhTestingId(null);
    }
  }

  function whCopySecret(id: string, secret: string) {
    navigator.clipboard.writeText(secret);
    setWhCopiedId(id);
    setTimeout(() => setWhCopiedId(null), 2000);
  }

  // ─── Accounting handlers ───

  async function handleDisconnect(provider: "xero" | "sage" | "quickbooks") {
    const label = provider === "xero" ? "Xero" : provider === "sage" ? "Sage" : "QuickBooks";
    if (!confirm(`Disconnect ${label}? This will stop all automatic syncing.`))
      return;
    setDisconnecting(provider);
    try {
      await fetch(`/api/integrations/${provider}/disconnect`, {
        method: "POST",
      });
      const setter = provider === "xero" ? setXeroStatus : provider === "sage" ? setSageStatus : setQuickbooksStatus;
      setter({ connected: false });
    } finally {
      setDisconnecting(null);
    }
  }

  async function handleToggleAutoSync(provider: "xero" | "sage" | "quickbooks") {
    const status = provider === "xero" ? xeroStatus : provider === "sage" ? sageStatus : quickbooksStatus;
    if (!status?.connected) return;
    setToggling(provider);
    try {
      const newValue = !status.auto_sync;
      const res = await fetch(`/api/integrations/${provider}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_sync: newValue }),
      });
      if (res.ok) {
        const setter = provider === "xero" ? setXeroStatus : provider === "sage" ? setSageStatus : setQuickbooksStatus;
        setter((prev) => (prev ? { ...prev, auto_sync: newValue } : prev));
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleAccountSettingChange(
    provider: "xero" | "sage" | "quickbooks",
    key: string,
    value: string
  ) {
    setSavingAccount(`${provider}-${key}`);
    try {
      const res = await fetch(`/api/integrations/${provider}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        const setter = provider === "xero" ? setXeroStatus : provider === "sage" ? setSageStatus : setQuickbooksStatus;
        // Map API key to status key
        const statusKeyMap: Record<string, string> = {
          sales_account_code: "sales_account_code",
          sales_tax_type: "sales_tax_type",
          sales_ledger_account_id: "sales_ledger_account_id",
          sales_tax_rate_id: "sales_tax_rate_id",
          sales_item_id: "sales_item_id",
          sales_tax_code_id: "sales_tax_code_id",
        };
        const statusKey = statusKeyMap[key] || key;
        setter((prev) => (prev ? { ...prev, [statusKey]: value } : prev));
      }
    } finally {
      setSavingAccount(null);
    }
  }

  async function handleTestSync(provider: "xero" | "quickbooks") {
    setTestSyncLoading(provider);
    setTestSyncResult(null);
    setTestSyncProvider(provider);
    try {
      const res = await fetch(`/api/integrations/${provider}/test-sync`, {
        method: "POST",
      });
      const data = await res.json();
      setTestSyncResult(data);
    } catch (err) {
      setTestSyncResult({
        error: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setTestSyncLoading(null);
    }
  }

  async function handleEcomDisconnect(provider: "shopify" | "squarespace") {
    const label = provider === "shopify" ? "Shopify" : "Squarespace";
    if (!confirm(`Disconnect ${label}? This will stop all ecommerce syncing and remove webhooks.`))
      return;
    setEcomDisconnecting(provider);
    try {
      await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
      const setter = provider === "shopify" ? setShopifyStatus : setSqStatus;
      setter({ connected: false });
    } finally {
      setEcomDisconnecting(null);
    }
  }

  async function handleEcomToggleSync(
    provider: "shopify" | "squarespace",
    key: "sync_products" | "sync_orders" | "sync_stock"
  ) {
    const status = provider === "shopify" ? shopifyStatus : sqStatus;
    if (!status?.connected) return;
    setEcomToggling(`${provider}-${key}`);
    try {
      const newValue = !status[key];
      const res = await fetch(`/api/integrations/${provider}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (res.ok) {
        const setter = provider === "shopify" ? setShopifyStatus : setSqStatus;
        setter((prev) => (prev ? { ...prev, [key]: newValue } : prev));
      }
    } finally {
      setEcomToggling(null);
    }
  }

  async function handleSqConnect() {
    if (!sqApiKey) {
      setSqError("API key is required.");
      return;
    }
    setSqConnecting(true);
    setSqError(null);
    try {
      const res = await fetch("/api/integrations/squarespace/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: sqApiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSqError(data.error || "Connection failed.");
        return;
      }
      setSuccessMessage("Squarespace connected successfully!");
      setTimeout(() => setSuccessMessage(null), 5000);
      setShowSqForm(false);
      setSqApiKey("");
      // Reload status
      const sqRes = await fetch("/api/integrations/squarespace/status");
      const sqData = await sqRes.json();
      setSqStatus(sqData);
    } catch {
      setSqError("Could not connect. Please check your API key and try again.");
    } finally {
      setSqConnecting(false);
    }
  }

  async function handleLoadSqStorePages(autoSelect = false) {
    setSqStorePagesLoading(true);
    try {
      const res = await fetch("/api/integrations/squarespace/store-pages");
      const data = await res.json();
      if (res.ok && data.storePages) {
        const pages = data.storePages as { id: string; title: string; isEnabled: boolean }[];
        setSqStorePages(pages);
        // Auto-select if only one enabled page and no page already selected
        if (autoSelect) {
          const enabled = pages.filter((p: { isEnabled: boolean }) => p.isEnabled);
          if (enabled.length === 1) {
            await handleSaveSqStorePage(enabled[0].id);
          }
        }
      }
    } catch {
      // Non-critical
    } finally {
      setSqStorePagesLoading(false);
    }
  }

  async function handleSaveSqStorePage(storePageId: string) {
    setSqSavingStorePage(true);
    try {
      const res = await fetch("/api/integrations/squarespace/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_page_id: storePageId }),
      });
      if (res.ok) {
        setSqStatus((prev) => prev ? { ...prev, store_page_id: storePageId } : prev);
      }
    } catch {
      // Non-critical
    } finally {
      setSqSavingStorePage(false);
    }
  }

  async function handleOpenImportModal(
    provider: "shopify" | "squarespace",
    connectionId: string
  ) {
    setImportModalProvider(provider);
    setImportConnectionId(connectionId);
    setImportLoading(true);
    setImportProducts([]);
    setImportSelected(new Set());
    setImportResult(null);
    setImportStep("select");
    setImportIsCoffee(true);
    setImportWeightAttribute(null);

    try {
      const res = await fetch(
        `/api/integrations/ecommerce/preview-products?connectionId=${connectionId}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch products");
      }
      setImportProducts(data.products || []);
      // Auto-select all not-yet-imported products
      const newSelection = new Set<string>();
      for (const p of data.products || []) {
        if (!p.already_imported) {
          newSelection.add(p.external_id);
        }
      }
      setImportSelected(newSelection);
    } catch (err) {
      console.error("[import] Preview error:", err);
      setImportProducts([]);
    } finally {
      setImportLoading(false);
    }
  }

  function handleToggleImportSelect(externalId: string) {
    setImportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(externalId)) {
        next.delete(externalId);
      } else {
        next.add(externalId);
      }
      return next;
    });
  }

  function handleSelectAllImport() {
    const importable = importProducts.filter((p) => !p.already_imported);
    if (importSelected.size === importable.length) {
      setImportSelected(new Set());
    } else {
      setImportSelected(new Set(importable.map((p) => p.external_id)));
    }
  }

  async function handleRunImport() {
    if (!importConnectionId || importSelected.size === 0) return;
    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch(
        "/api/integrations/ecommerce/import-products",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId: importConnectionId,
            selectedProductIds: Array.from(importSelected),
            isCoffee: importIsCoffee,
            weightAttributeName: importIsCoffee ? importWeightAttribute : null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setImportResult({
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [data.error || "Import failed"],
          total: 0,
        });
        return;
      }
      setImportResult(data);
      // Reload ecommerce status to get updated last sync timestamp
      loadStatus();
    } catch (err) {
      setImportResult({
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [
          err instanceof Error ? err.message : "Import failed",
        ],
        total: 0,
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleOpenExportModal(
    provider: "shopify" | "squarespace",
    connectionId: string
  ) {
    setExportModalProvider(provider);
    setExportConnectionId(connectionId);
    setExportLoading(true);
    setExportProducts([]);
    setExportSelected(new Set());
    setExportResult(null);

    try {
      // Fetch roaster's products that are NOT already mapped to this connection
      const res = await fetch(
        `/api/integrations/ecommerce/export-products?connectionId=${connectionId}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch products");
      }
      setExportProducts(data.products || []);
      // Auto-select all exportable products
      const newSelection = new Set<string>();
      for (const p of data.products || []) {
        newSelection.add(p.id);
      }
      setExportSelected(newSelection);
    } catch (err) {
      console.error("[export] Preview error:", err);
      setExportProducts([]);
    } finally {
      setExportLoading(false);
    }
  }

  function handleToggleExportSelect(productId: string) {
    setExportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  function handleSelectAllExport() {
    if (exportSelected.size === exportProducts.length) {
      setExportSelected(new Set());
    } else {
      setExportSelected(new Set(exportProducts.map((p) => p.id)));
    }
  }

  async function handleRegisterWebhooks(provider: "shopify" | "squarespace") {
    setRegisteringWebhooks(provider);
    try {
      const res = await fetch(`/api/integrations/${provider}/register-webhooks`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        const hasOrdersWebhook = !!data.registered?.["orders/create"];
        const msg = hasOrdersWebhook
          ? "Webhooks registered successfully!"
          : "Product webhooks registered. Order webhook requires Protected Customer Data access — see Shopify Partner Dashboard.";
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 8000);
        // Refresh status to get updated webhook_ids
        loadStatus();
      } else {
        setSuccessMessage(null);
      }
    } catch {
      // Silent fail
    } finally {
      setRegisteringWebhooks(null);
    }
  }

  async function handleRunExport() {
    if (!exportConnectionId || exportSelected.size === 0) return;
    setExporting(true);
    setExportResult(null);

    try {
      const res = await fetch(
        "/api/integrations/ecommerce/export-products",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId: exportConnectionId,
            productIds: Array.from(exportSelected),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setExportResult({
          exported: 0,
          errors: [data.error || "Export failed"],
          total: 0,
        });
        return;
      }
      setExportResult(data);
      loadStatus();
    } catch (err) {
      setExportResult({
        exported: 0,
        errors: [err instanceof Error ? err.message : "Export failed"],
        total: 0,
      });
    } finally {
      setExporting(false);
    }
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-40 bg-slate-100 rounded-xl" />
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  function renderIntegrationCard(
    provider: "xero" | "sage" | "quickbooks",
    status: IntegrationStatus | null,
    config: {
      label: string;
      description: string;
      bgColor: string;
      hoverColor: string;
      logoLetter: string;
    }
  ) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-white font-bold text-lg">
                {config.logoLetter}
              </span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {config.label}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {config.description}
              </p>
            </div>
          </div>

          {status?.connected && (
            <span
              className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                status.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {status.is_active ? "Connected" : "Reconnect Required"}
            </span>
          )}
        </div>

        {status?.connected ? (
          <div className="mt-5 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Organisation</span>
                <span className="font-medium text-slate-900">
                  {status.tenant_name || "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Connected</span>
                <span className="text-slate-700">
                  {formatDate(status.connected_at)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Last sync</span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  {status.last_sync_status === "success" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  )}
                  {status.last_sync_status === "error" && (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  {formatDate(status.last_sync_at)}
                </span>
              </div>
            </div>

            {status.error && status.is_active && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{status.error}</span>
              </div>
            )}

            {!status.is_active && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Reconnection required</p>
                  <p className="mt-0.5">
                    Your {config.label} access has expired or been revoked.
                    Please reconnect to resume syncing.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">Auto-sync</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically push invoices, contacts, and payments to{" "}
                  {config.label}
                </p>
              </div>
              <button
                onClick={() => handleToggleAutoSync(provider)}
                disabled={toggling === provider}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                  status.auto_sync ? "bg-brand-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    status.auto_sync ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Account code settings */}
            {status.is_active && provider === "xero" && status.available_accounts && (
              <div className="space-y-3 py-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  Account Mapping
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sales Account
                    </label>
                    <select
                      value={status.sales_account_code || "200"}
                      onChange={(e) =>
                        handleAccountSettingChange("xero", "sales_account_code", e.target.value)
                      }
                      disabled={savingAccount === "xero-sales_account_code"}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:opacity-50"
                    >
                      {(status.available_accounts || []).map((a) => (
                        <option key={a.code} value={a.code}>
                          {`${a.code} — ${a.name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  {status.available_tax_types && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tax Rate
                      </label>
                      <select
                        value={status.sales_tax_type || "OUTPUT2"}
                        onChange={(e) =>
                          handleAccountSettingChange("xero", "sales_tax_type", e.target.value)
                        }
                        disabled={savingAccount === "xero-sales_tax_type"}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:opacity-50"
                      >
                        {(status.available_tax_types || []).map((t) => (
                          <option key={t.type} value={t.type}>
                            {`${t.name}${t.rate != null ? ` (${t.rate}%)` : ""}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {status.is_active && provider === "sage" && status.available_ledger_accounts && (
              <div className="space-y-3 py-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  Account Mapping
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sales Ledger Account
                    </label>
                    <select
                      value={status.sales_ledger_account_id || ""}
                      onChange={(e) =>
                        handleAccountSettingChange("sage", "sales_ledger_account_id", e.target.value)
                      }
                      disabled={savingAccount === "sage-sales_ledger_account_id"}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:opacity-50"
                    >
                      {(status.available_ledger_accounts || []).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {status.available_tax_rates && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tax Rate
                      </label>
                      <select
                        value={status.sales_tax_rate_id || ""}
                        onChange={(e) =>
                          handleAccountSettingChange("sage", "sales_tax_rate_id", e.target.value)
                        }
                        disabled={savingAccount === "sage-sales_tax_rate_id"}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:opacity-50"
                      >
                        {(status.available_tax_rates || []).map((r) => (
                          <option key={r.id} value={r.id}>
                            {`${r.name}${r.rate != null ? ` (${r.rate}%)` : ""}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {status.is_active && provider === "quickbooks" && status.available_items && (
              <div className="space-y-3 py-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  Account Mapping
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sales Item
                    </label>
                    <select
                      value={status.sales_item_id || ""}
                      onChange={(e) =>
                        handleAccountSettingChange("quickbooks", "sales_item_id", e.target.value)
                      }
                      disabled={savingAccount === "quickbooks-sales_item_id"}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:opacity-50"
                    >
                      {(status.available_items || []).map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {status.available_tax_codes && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tax Code
                      </label>
                      <select
                        value={status.sales_tax_code_id || ""}
                        onChange={(e) =>
                          handleAccountSettingChange("quickbooks", "sales_tax_code_id", e.target.value)
                        }
                        disabled={savingAccount === "quickbooks-sales_tax_code_id"}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:opacity-50"
                      >
                        {(status.available_tax_codes || []).map((tc) => (
                          <option key={tc.id} value={tc.id}>
                            {tc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {!status.is_active ? (
                <a
                  href={`/api/integrations/${provider}/connect`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect {config.label}
                </a>
              ) : null}
              {(provider === "xero" || provider === "quickbooks") && status.is_active && (
                <button
                  onClick={() => handleTestSync(provider)}
                  disabled={testSyncLoading === provider}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  {testSyncLoading === provider ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {testSyncLoading === provider ? "Testing..." : "Test Sync"}
                </button>
              )}
              <button
                onClick={() => handleDisconnect(provider)}
                disabled={disconnecting === provider}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {disconnecting === provider
                  ? "Disconnecting..."
                  : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <a
              href={`/api/integrations/${provider}/connect`}
              className={`inline-flex items-center gap-2 px-4 py-2 ${config.bgColor} text-white rounded-lg text-sm font-semibold ${config.hoverColor} transition-colors`}
            >
              <ExternalLink className="w-4 h-4" />
              Connect {config.label}
            </a>
            <p className="text-xs text-slate-400 mt-2">
              You&apos;ll be redirected to {config.label} to authorise access.
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderEcommerceCard(
    provider: "shopify" | "squarespace",
    status: EcommerceStatus | null,
    config: {
      label: string;
      description: string;
      bgColor: string;
      hoverColor: string;
      icon: React.ReactNode;
    }
  ) {
    const syncToggles: { key: "sync_products" | "sync_orders" | "sync_stock"; label: string; description: string }[] = [
      { key: "sync_products", label: "Sync products", description: `Push product data to ${config.label}` },
      { key: "sync_orders", label: "Sync orders", description: `Receive orders from ${config.label}` },
      { key: "sync_stock", label: "Sync stock", description: `Keep stock levels in sync with ${config.label}` },
    ];

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}
            >
              {config.icon}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {config.label}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {config.description}
              </p>
            </div>
          </div>

          {status?.connected && (
            <span
              className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                status.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {status.is_active ? "Connected" : "Inactive"}
            </span>
          )}
        </div>

        {status?.connected ? (
          <div className="mt-5 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Store</span>
                <span className="font-medium text-slate-900">
                  {status.shop_name || status.store_url || "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Connected</span>
                <span className="text-slate-700">
                  {formatDate(status.connected_at)}
                </span>
              </div>
              {status.last_product_sync_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Last product sync</span>
                  <span className="text-slate-700">
                    {formatDate(status.last_product_sync_at)}
                  </span>
                </div>
              )}
              {status.last_order_sync_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Last order sync</span>
                  <span className="text-slate-700">
                    {formatDate(status.last_order_sync_at)}
                  </span>
                </div>
              )}
              {status.last_stock_sync_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Last stock sync</span>
                  <span className="text-slate-700">
                    {formatDate(status.last_stock_sync_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Squarespace write-access warning */}
            {provider === "squarespace" && status.has_write_access === false && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Read-only API key detected
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Your Squarespace API key does not have write permissions. Product export and stock sync will fail. Generate a new API key with <strong>Read and Write</strong> Commerce permissions, then disconnect and reconnect.
                  </p>
                </div>
              </div>
            )}

            {/* Squarespace store page selector */}
            {provider === "squarespace" && (() => {
              const selectedPageTitle = sqStorePages.find((p) => p.id === status.store_page_id)?.title;
              return (
                <div className={`rounded-lg p-4 space-y-2 ${!status.store_page_id ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Store Page</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Products will be exported to this store page.
                      </p>
                    </div>
                    {!status.store_page_id && !sqStorePagesLoading && (
                      <span className="text-xs font-medium text-amber-600">Required for export</span>
                    )}
                  </div>
                  {sqStorePagesLoading && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading store pages...</span>
                    </div>
                  )}
                  {!sqStorePagesLoading && status.store_page_id && sqStorePages.length === 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 font-medium">
                        {selectedPageTitle || status.store_page_id}
                      </span>
                      <button
                        onClick={() => handleLoadSqStorePages(false)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  {!sqStorePagesLoading && !status.store_page_id && sqStorePages.length === 0 && (
                    <button
                      onClick={() => handleLoadSqStorePages(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                    >
                      <Store className="w-3 h-3" />
                      Select Store Page
                    </button>
                  )}
                  {!sqStorePagesLoading && sqStorePages.length > 0 && (
                    <div className="space-y-1.5">
                      {sqStorePages.filter((p) => p.isEnabled).map((page) => (
                        <button
                          key={page.id}
                          onClick={() => handleSaveSqStorePage(page.id)}
                          disabled={sqSavingStorePage}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                            status.store_page_id === page.id
                              ? "border-brand-300 bg-brand-50 text-brand-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/50"
                          }`}
                        >
                          <span className="font-medium">{page.title}</span>
                          {status.store_page_id === page.id && (
                            <CheckCircle2 className="w-4 h-4 text-brand-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Webhook status — Shopify only */}
            {provider === "shopify" && status.webhook_ids && (
              <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Webhooks
                  </p>
                  <button
                    onClick={() => handleRegisterWebhooks(provider)}
                    disabled={registeringWebhooks === provider}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                  >
                    {registeringWebhooks === provider
                      ? "Registering..."
                      : "Re-register"}
                  </button>
                </div>
                {(["orders/create", "products/update", "products/create"] as const).map(
                  (topic) => (
                    <div
                      key={topic}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-600">{topic}</span>
                      {status.webhook_ids?.[topic] ? (
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Not registered
                        </span>
                      )}
                    </div>
                  )
                )}
                {!status.webhook_ids?.["orders/create"] && (
                  <p className="text-xs text-amber-600 mt-1">
                    Order webhook requires Protected Customer Data access in
                    your Shopify Partner Dashboard.
                  </p>
                )}
              </div>
            )}

            {/* Sync toggles */}
            <div className="space-y-3">
              {syncToggles.map((toggle) => (
                <div key={toggle.key} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{toggle.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{toggle.description}</p>
                  </div>
                  <button
                    onClick={() => handleEcomToggleSync(provider, toggle.key)}
                    disabled={ecomToggling === `${provider}-${toggle.key}`}
                    className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                      status[toggle.key] ? "bg-brand-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        status[toggle.key] ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {status.connection_id && (
                <>
                  <button
                    onClick={() =>
                      handleOpenImportModal(provider, status.connection_id!)
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Import Products
                  </button>
                  <button
                    onClick={() =>
                      handleOpenExportModal(provider, status.connection_id!)
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Export Products
                  </button>
                </>
              )}
              <button
                onClick={() => handleEcomDisconnect(provider)}
                disabled={ecomDisconnecting === provider}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {ecomDisconnecting === provider ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            {provider === "shopify" && !showShopifyInput && (
              <>
                <button
                  onClick={() => setShowShopifyInput(true)}
                  className={`inline-flex items-center gap-2 px-4 py-2 ${config.bgColor} text-white rounded-lg text-sm font-semibold ${config.hoverColor} transition-colors`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Connect {config.label}
                </button>
                <p className="text-xs text-slate-400 mt-2">
                  You&apos;ll be redirected to Shopify to authorise access.
                </p>
              </>
            )}

            {provider === "shopify" && showShopifyInput && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Shop URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shopifyShopUrl}
                      onChange={(e) => setShopifyShopUrl(e.target.value)}
                      placeholder="mystore.myshopify.com"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    />
                    <a
                      href={shopifyShopUrl ? `/api/integrations/shopify/connect?shop=${encodeURIComponent(shopifyShopUrl)}` : "#"}
                      onClick={(e) => {
                        if (!shopifyShopUrl.trim()) {
                          e.preventDefault();
                        }
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 ${config.bgColor} text-white rounded-lg text-sm font-semibold ${config.hoverColor} transition-colors ${!shopifyShopUrl.trim() ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Connect
                    </a>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Enter your Shopify store URL, e.g. mystore.myshopify.com
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowShopifyInput(false);
                    setShopifyShopUrl("");
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            )}

            {provider === "squarespace" && !showSqForm && (
              <>
                <button
                  onClick={() => setShowSqForm(true)}
                  className={`inline-flex items-center gap-2 px-4 py-2 ${config.bgColor} text-white rounded-lg text-sm font-semibold ${config.hoverColor} transition-colors`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Connect {config.label}
                </button>
                <p className="text-xs text-slate-400 mt-2">
                  Enter your Squarespace Commerce API key to connect. Ensure the key has <strong>Read and Write</strong> permissions.
                </p>
              </>
            )}

            {provider === "squarespace" && showSqForm && (
              <div className="space-y-3">
                {sqError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{sqError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={sqShowKey ? "text" : "password"}
                      value={sqApiKey}
                      onChange={(e) => setSqApiKey(e.target.value)}
                      placeholder="Your Squarespace API key"
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setSqShowKey(!sqShowKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {sqShowKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSqConnect}
                    disabled={sqConnecting}
                    className={`inline-flex items-center gap-2 px-4 py-2 ${config.bgColor} text-white rounded-lg text-sm font-semibold ${config.hoverColor} transition-colors disabled:opacity-50`}
                  >
                    {sqConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {sqConnecting ? "Connecting..." : "Test & Connect"}
                  </button>
                  <button
                    onClick={() => {
                      setShowSqForm(false);
                      setSqApiKey("");
                      setSqError(null);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Generate an API key in Squarespace &rarr; Settings &rarr; Developer Tools &rarr; API Keys. Grant <strong>Read and Write</strong> Commerce permissions.
                </p>
              </div>
            )}

          </div>
        )}
      </div>
    );
  }

  const stripeIsConnected = stripeStatus?.connected && stripeStatus.onboarding_complete;
  const stripeHasRequirements =
    stripeStatus?.requirements &&
    (stripeStatus.requirements.currently_due.length > 0 ||
      stripeStatus.requirements.past_due.length > 0);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-500 mt-1">
          Connect external services to automatically sync your data.
        </p>
      </div>

      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6" aria-label="Integration tabs">
          {/* HIDDEN: Stripe Connect - restore when storefront/online payments feature is launched */}
          {/* <button
            onClick={() => switchTab("payments")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "payments"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Payments
          </button> */}
          <button
            onClick={() => switchTab("accounting")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "accounting"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Accounting
            {accountingLocked && <Lock className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => switchTab("ecommerce")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "ecommerce"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Ecommerce
            {ecommerceLocked && <Lock className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => switchTab("webhooks")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "webhooks"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Webhooks
          </button>
          <button
            onClick={() => switchTab("social")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "social"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Social
            {socialLocked && <Lock className="w-3.5 h-3.5" />}
          </button>
        </nav>
      </div>

      {/* HIDDEN: Stripe Connect - restore when storefront/online payments feature is launched */}
      {/* {activeTab === "payments" && (
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            ... Stripe Connect section ...
          </section>
        </div>
      )} */}

      {/* ═══════════════════════════════════════════════ */}
      {/* Tab: Accounting                                */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === "accounting" && (
        accountingLocked ? (
          <FeatureGate
            featureName="Accounting Integrations"
            requiredTier={getMinimumTierForFeature("integrationsAccounting" as FeatureKey).tier}
            productType="sales"
          />
        ) : <>
          {xeroStatus?.error && !xeroStatus.connected && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {xeroStatus.error}
            </div>
          )}

          {sageStatus?.error && !sageStatus.connected && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {sageStatus.error}
            </div>
          )}

          {quickbooksStatus?.error && !quickbooksStatus.connected && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {quickbooksStatus.error}
            </div>
          )}

          <div className="mb-6">
            <p className="text-sm text-slate-500">
              Connect your accounting software to automatically sync invoices, contacts, and payments.
            </p>
          </div>

          <div className="space-y-4">
            {renderIntegrationCard("xero", xeroStatus, {
              label: "Xero",
              description:
                "Automatically sync invoices, contacts, and payments with your Xero accounting software.",
              bgColor: "bg-[#13B5EA]",
              hoverColor: "hover:bg-[#0e9dcc]",
              logoLetter: "X",
            })}

            {renderIntegrationCard("sage", sageStatus, {
              label: "Sage",
              description:
                "Automatically sync invoices, contacts, and payments with your Sage accounting software.",
              bgColor: "bg-[#00DC82]",
              hoverColor: "hover:bg-[#00c070]",
              logoLetter: "S",
            })}

            {renderIntegrationCard("quickbooks", quickbooksStatus, {
              label: "QuickBooks",
              description:
                "Automatically sync invoices, contacts, and payments with your QuickBooks accounting software.",
              bgColor: "bg-[#2CA01C]",
              hoverColor: "hover:bg-[#238a17]",
              logoLetter: "Q",
            })}
          </div>

          {/* Info section */}
          <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              What gets synced?
            </h3>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Invoices</strong> — automatically created when you generate
                  an invoice
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Contacts</strong> — synced when you approve a wholesale
                  buyer or create a contact
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Payments</strong> — recorded when invoice payments are
                  logged
                </span>
              </li>
            </ul>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* Tab: Ecommerce                                 */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === "ecommerce" && (
        ecommerceLocked ? (
          <FeatureGate
            featureName="E-commerce Integrations"
            requiredTier={getMinimumTierForFeature("integrationsEcommerce" as FeatureKey).tier}
            productType="sales"
          />
        ) : <>
          <div className="mb-6">
            <p className="text-sm text-slate-500">
              Connect your online store to sync products, orders, and stock levels.
            </p>
          </div>

          <div className="space-y-4">
            {renderEcommerceCard("shopify", shopifyStatus, {
              label: "Shopify",
              description:
                "Sync products, orders, and stock levels with your Shopify store.",
              bgColor: "bg-[#96BF48]",
              hoverColor: "hover:bg-[#7ea83d]",
              icon: <ShoppingCart className="w-6 h-6 text-white" />,
            })}

            {renderEcommerceCard("squarespace", sqStatus, {
              label: "Squarespace",
              description:
                "Sync products, orders, and stock levels with your Squarespace store.",
              bgColor: "bg-[#222222]",
              hoverColor: "hover:bg-[#111111]",
              icon: <Store className="w-6 h-6 text-white" />,
            })}
          </div>

          {/* Product Mapping link — shown when any ecommerce connection exists */}
          {(shopifyStatus?.connected || sqStatus?.connected) && (
            <div className="mt-4">
              <Link
                href="/settings/integrations/product-mapping"
                className="flex items-center justify-between w-full bg-white rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                    <Link2 className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Product Stock Mapping
                    </p>
                    <p className="text-xs text-slate-500">
                      Link imported products to your roasted stock and green bean
                      records
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unmappedCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {unmappedCount} unmapped
                    </span>
                  )}
                  <svg
                    className="w-5 h-5 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* Tab: Webhooks                                  */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === "webhooks" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Webhooks</h2>
              <p className="text-sm text-slate-500 mt-1">
                Send real-time event data to external services like Zapier or your
                accounting system.
              </p>
            </div>
            <button
              onClick={whOpenAddForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Webhook
            </button>
          </div>

          {webhooksLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-slate-100 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Webhook list */}
              {webhooks.length === 0 && !whShowForm && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-1">No webhooks configured</p>
                  <p className="text-sm text-slate-400">
                    Add a webhook to send event notifications to external services.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {webhooks.map((wh) => (
                  <div
                    key={wh.id}
                    className={`bg-white rounded-xl border p-5 ${
                      wh.is_active
                        ? "border-slate-200"
                        : "border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono text-slate-900 truncate block">
                            {wh.url}
                          </code>
                          <span
                            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              wh.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {wh.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mb-2">
                          {wh.events && wh.events.length > 0
                            ? wh.events.map((e) => WEBHOOK_EVENT_LABELS[e] || e).join(", ")
                            : "All events"}
                        </p>

                        {/* Secret */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Secret:</span>
                          <code className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                            {`${wh.secret.slice(0, 8)}...${wh.secret.slice(-4)}`}
                          </code>
                          <button
                            onClick={() => whCopySecret(wh.id, wh.secret)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Copy full secret"
                          >
                            {whCopiedId === wh.id ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Test result */}
                        {whTestResult?.id === wh.id && (
                          <p
                            className={`text-xs mt-2 ${
                              whTestResult.success
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {whTestResult.success ? "Test sent: " : "Test failed: "}
                            {whTestResult.message}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => whHandleTest(wh.id)}
                          disabled={whTestingId === wh.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          {whTestingId === wh.id ? "Sending..." : "Test"}
                        </button>
                        <button
                          onClick={() => whHandleToggleActive(wh)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          title={wh.is_active ? "Disable" : "Enable"}
                        >
                          <Zap
                            className={`w-4 h-4 ${wh.is_active ? "text-green-500" : ""}`}
                          />
                        </button>
                        <button
                          onClick={() => whOpenEditForm(wh)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => whHandleDelete(wh.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add/Edit form */}
              {whShowForm && (
                <div className="mt-4 bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {whEditingId ? "Edit Webhook" : "New Webhook"}
                    </h3>
                    <button
                      onClick={whCloseForm}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Endpoint URL
                      </label>
                      <input
                        type="url"
                        value={whUrl}
                        onChange={(e) => setWhUrl(e.target.value)}
                        placeholder="https://hooks.zapier.com/..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Events
                      </label>
                      <label className="flex items-center gap-2 mb-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={whAllEvents}
                          onChange={(e) => {
                            setWhAllEvents(e.target.checked);
                            if (e.target.checked) setWhSelectedEvents([]);
                          }}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm text-slate-700">All events</span>
                      </label>

                      {!whAllEvents && (
                        <div className="grid grid-cols-2 gap-2 pl-6">
                          {WEBHOOK_EVENTS.map((event) => (
                            <label
                              key={event}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={whSelectedEvents.includes(event)}
                                onChange={() => whToggleEvent(event)}
                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                              />
                              <span className="text-sm text-slate-600">
                                {WEBHOOK_EVENT_LABELS[event] || event}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {whError && <p className="mt-3 text-sm text-red-600">{whError}</p>}

                  <div className="flex justify-end gap-2 mt-5">
                    <button
                      onClick={whCloseForm}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={whHandleSave}
                      disabled={whSaving}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {whSaving
                        ? "Saving..."
                        : whEditingId
                          ? "Update Webhook"
                          : "Create Webhook"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* Tab: Social                                    */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === "social" && (
        socialLocked ? (
          <FeatureGate
            featureName="Social Integrations"
            requiredTier={getMinimumTierForFeature("integrationsSocial" as FeatureKey).tier}
            productType="marketing"
          />
        ) : (
          <SocialConnectionsTab />
        )
      )}

      {/* Import Products Modal */}
      {importModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Import Products from{" "}
                  {importModalProvider === "shopify" ? "Shopify" : "Squarespace"}
                </h2>
                {!importResult && !importLoading && importProducts.length > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {importProducts.length} product
                    {importProducts.length !== 1 ? "s" : ""} found
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setImportModalProvider(null);
                  setImportResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {importLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <p className="text-sm">
                    Fetching products from your store...
                  </p>
                </div>
              )}

              {!importLoading && !importResult && importProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Package className="w-8 h-8 mb-3" />
                  <p className="text-sm">
                    No products found in your store.
                  </p>
                </div>
              )}

              {/* Step 1: Product selection */}
              {!importLoading && !importResult && importProducts.length > 0 && importStep === "select" && (
                <div>
                  {/* Select all header */}
                  <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border-b border-slate-200">
                    <button
                      onClick={handleSelectAllImport}
                      className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          importSelected.size ===
                          importProducts.filter((p) => !p.already_imported)
                            .length && importSelected.size > 0
                            ? "bg-brand-600 border-brand-600"
                            : "border-slate-300"
                        }`}
                      >
                        {importSelected.size ===
                          importProducts.filter((p) => !p.already_imported)
                            .length && importSelected.size > 0 && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </span>
                      Select all ({importProducts.filter((p) => !p.already_imported).length})
                    </button>
                    {importSelected.size > 0 && (
                      <span className="text-xs text-slate-500">
                        {importSelected.size} selected
                      </span>
                    )}
                  </div>

                  {/* Product list */}
                  <div className="divide-y divide-slate-100">
                    {importProducts.map((product) => (
                      <div
                        key={product.external_id}
                        className={`flex items-center gap-3 px-6 py-3 ${
                          product.already_imported
                            ? "opacity-60 bg-slate-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {!product.already_imported ? (
                          <button
                            onClick={() =>
                              handleToggleImportSelect(product.external_id)
                            }
                            className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                              importSelected.has(product.external_id)
                                ? "bg-brand-600 border-brand-600"
                                : "border-slate-300"
                            }`}
                          >
                            {importSelected.has(product.external_id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </button>
                        ) : (
                          <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          </span>
                        )}

                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {product.sku && <span>SKU: {product.sku}</span>}
                            {product.variant_count > 1 && (
                              <span>
                                {product.variant_count} variant
                                {product.variant_count !== 1 ? "s" : ""}
                              </span>
                            )}
                            {product.already_imported && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                Already imported
                              </span>
                            )}
                          </div>
                        </div>

                        {product.price && (
                          <span className="text-sm font-medium text-slate-700 flex-shrink-0">
                            &pound;{parseFloat(product.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Attribute mapping */}
              {!importLoading && !importResult && importStep === "mapping" && (
                <div className="p-6 space-y-6">
                  {/* Product type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-2">
                      Product type
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImportIsCoffee(true)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          importIsCoffee
                            ? "bg-brand-600 border-brand-600 text-white"
                            : "border-slate-300 text-slate-700 hover:border-slate-400"
                        }`}
                      >
                        Coffee
                      </button>
                      <button
                        onClick={() => {
                          setImportIsCoffee(false);
                          setImportWeightAttribute(null);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          !importIsCoffee
                            ? "bg-brand-600 border-brand-600 text-white"
                            : "border-slate-300 text-slate-700 hover:border-slate-400"
                        }`}
                      >
                        Other
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {importIsCoffee
                        ? "Coffee products use weight-based variants for stock calculations."
                        : "Non-coffee products import all attributes as custom option types."}
                    </p>
                  </div>

                  {/* Weight attribute mapping — coffee only */}
                  {importIsCoffee && (() => {
                    // Collect unique attribute names from selected products
                    const selectedProducts = importProducts.filter(
                      (p) => importSelected.has(p.external_id) && !p.already_imported
                    );
                    const allNames = Array.from(
                      new Set(selectedProducts.flatMap((p) => p.option_names || []))
                    );
                    if (allNames.length === 0) return null;

                    return (
                      <div>
                        <label className="block text-sm font-medium text-slate-800 mb-2">
                          Which attribute represents weight?
                        </label>
                        <p className="text-xs text-slate-500 mb-3">
                          This maps to the product weight for stock tracking and shipping calculations.
                        </p>
                        <div className="space-y-2">
                          {allNames.map((name) => (
                            <label
                              key={name}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                importWeightAttribute === name
                                  ? "border-brand-600 bg-brand-50"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="weightAttr"
                                checked={importWeightAttribute === name}
                                onChange={() => setImportWeightAttribute(name)}
                                className="w-4 h-4 text-brand-600"
                              />
                              <span className="text-sm font-medium text-slate-800">{name}</span>
                            </label>
                          ))}
                          <label
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              importWeightAttribute === null
                                ? "border-brand-600 bg-brand-50"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="weightAttr"
                              checked={importWeightAttribute === null}
                              onChange={() => setImportWeightAttribute(null)}
                              className="w-4 h-4 text-brand-600"
                            />
                            <span className="text-sm text-slate-500">None / auto-detect from values</span>
                          </label>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Summary */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-slate-800 mb-1">
                      Import summary
                    </p>
                    <p className="text-xs text-slate-500">
                      {importSelected.size} product{importSelected.size !== 1 ? "s" : ""} will be imported as{" "}
                      <span className="font-medium text-slate-700">{importIsCoffee ? "coffee" : "other"}</span>
                      {importIsCoffee && importWeightAttribute && (
                        <> with <span className="font-medium text-slate-700">{importWeightAttribute}</span> mapped to weight</>
                      )}
                      . All variant attributes will be created as option types.
                    </p>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="p-6 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-green-800">
                      Import complete
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-700">
                          {importResult.imported}
                        </p>
                        <p className="text-xs text-green-600">Imported</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-700">
                          {importResult.updated}
                        </p>
                        <p className="text-xs text-blue-600">Updated</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-500">
                          {importResult.skipped}
                        </p>
                        <p className="text-xs text-slate-400">Skipped</p>
                      </div>
                    </div>
                  </div>

                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-amber-800 mb-2">
                        Errors ({importResult.errors.length})
                      </p>
                      <ul className="text-xs text-amber-700 space-y-1">
                        {importResult.errors.map((err, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  if (importStep === "mapping") {
                    setImportStep("select");
                  } else {
                    setImportModalProvider(null);
                    setImportResult(null);
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {importResult ? "Done" : importStep === "mapping" ? "Back" : "Cancel"}
              </button>

              {!importResult && !importLoading && importProducts.length > 0 && importStep === "select" && (
                <button
                  onClick={() => setImportStep("mapping")}
                  disabled={importSelected.size === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  Next
                </button>
              )}

              {!importResult && importStep === "mapping" && (
                <button
                  onClick={handleRunImport}
                  disabled={importing || importSelected.size === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {importing
                    ? "Importing..."
                    : `Import ${importSelected.size} Product${importSelected.size !== 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Products Modal */}
      {exportModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Export Products to{" "}
                  {exportModalProvider === "shopify" ? "Shopify" : "Squarespace"}
                </h2>
                {!exportResult && !exportLoading && exportProducts.length > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {exportProducts.length} product
                    {exportProducts.length !== 1 ? "s" : ""} available to export
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setExportModalProvider(null);
                  setExportResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {exportLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <p className="text-sm">Loading your products...</p>
                </div>
              )}

              {!exportLoading && !exportResult && exportProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Package className="w-8 h-8 mb-3" />
                  <p className="text-sm">
                    All your products are already exported to this store.
                  </p>
                </div>
              )}

              {!exportLoading && !exportResult && exportProducts.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border-b border-slate-200">
                    <button
                      onClick={handleSelectAllExport}
                      className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          exportSelected.size === exportProducts.length &&
                          exportSelected.size > 0
                            ? "bg-brand-600 border-brand-600"
                            : "border-slate-300"
                        }`}
                      >
                        {exportSelected.size === exportProducts.length &&
                          exportSelected.size > 0 && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                      </span>
                      Select all ({exportProducts.length})
                    </button>
                    {exportSelected.size > 0 && (
                      <span className="text-xs text-slate-500">
                        {exportSelected.size} selected
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100">
                    {exportProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50"
                      >
                        <button
                          onClick={() => handleToggleExportSelect(product.id)}
                          className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                            exportSelected.has(product.id)
                              ? "bg-brand-600 border-brand-600"
                              : "border-slate-300"
                          }`}
                        >
                          {exportSelected.has(product.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>

                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {product.sku && <span>SKU: {product.sku}</span>}
                            {product.variant_count > 1 && (
                              <span>
                                {product.variant_count} variant
                                {product.variant_count !== 1 ? "s" : ""}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                product.status === "published"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {product.status === "published"
                                ? "Published"
                                : "Draft"}
                            </span>
                          </div>
                        </div>

                        {product.retail_price != null && (
                          <span className="text-sm font-medium text-slate-700 flex-shrink-0">
                            &pound;{product.retail_price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {exportResult && (
                <div className="p-6 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-green-800">
                      Export complete
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-700">
                          {exportResult.exported}
                        </p>
                        <p className="text-xs text-green-600">Exported</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-500">
                          {exportResult.total - exportResult.exported}
                        </p>
                        <p className="text-xs text-slate-400">Skipped</p>
                      </div>
                    </div>
                  </div>

                  {exportResult.errors && exportResult.errors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-amber-800 mb-2">
                        Errors ({exportResult.errors.length})
                      </p>
                      <ul className="text-xs text-amber-700 space-y-1">
                        {exportResult.errors.map((err, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5"
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setExportModalProvider(null);
                  setExportResult(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {exportResult ? "Done" : "Cancel"}
              </button>

              {!exportResult && !exportLoading && exportProducts.length > 0 && (
                <button
                  onClick={handleRunExport}
                  disabled={exporting || exportSelected.size === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {exporting
                    ? "Exporting..."
                    : `Export ${exportSelected.size} Product${exportSelected.size !== 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Sync Result Modal */}
      {testSyncResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                {testSyncProvider === "quickbooks" ? "QuickBooks" : "Xero"} Test Sync Result
              </h2>
              <button
                onClick={() => setTestSyncResult(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words bg-slate-50 rounded-lg p-4 border border-slate-200">
                {JSON.stringify(testSyncResult, null, 2)}
              </pre>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setTestSyncResult(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StripeCapabilityBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
      {enabled ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      )}
      <span className="text-sm text-slate-700">
        {`${label}: ${enabled ? "Enabled" : "Disabled"}`}
      </span>
    </div>
  );
}

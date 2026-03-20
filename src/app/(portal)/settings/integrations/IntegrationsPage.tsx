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
} from "lucide-react";

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
  const [wooStatus, setWooStatus] = useState<EcommerceStatus | null>(null);
  const [sqStatus, setSqStatus] = useState<EcommerceStatus | null>(null);
  const [ecomDisconnecting, setEcomDisconnecting] = useState<string | null>(null);
  const [ecomToggling, setEcomToggling] = useState<string | null>(null);

  // Shopify connect
  const [shopifyShopUrl, setShopifyShopUrl] = useState("");
  const [showShopifyInput, setShowShopifyInput] = useState(false);

  // WooCommerce connect form
  const [showWooForm, setShowWooForm] = useState(false);
  const [wooStoreUrl, setWooStoreUrl] = useState("");
  const [wooConsumerKey, setWooConsumerKey] = useState("");
  const [wooConsumerSecret, setWooConsumerSecret] = useState("");
  const [wooShowSecret, setWooShowSecret] = useState(false);
  const [wooConnecting, setWooConnecting] = useState(false);
  const [wooError, setWooError] = useState<string | null>(null);

  // Squarespace connect form
  const [showSqForm, setShowSqForm] = useState(false);
  const [sqApiKey, setSqApiKey] = useState("");
  const [sqShowKey, setSqShowKey] = useState(false);
  const [sqConnecting, setSqConnecting] = useState(false);
  const [sqError, setSqError] = useState<string | null>(null);

  // Import modal state
  const [importModalProvider, setImportModalProvider] = useState<"shopify" | "woocommerce" | "squarespace" | null>(null);
  const [importConnectionId, setImportConnectionId] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProducts, setImportProducts] = useState<PreviewProduct[]>([]);
  const [importSelected, setImportSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [unmappedCount, setUnmappedCount] = useState(0);

  // Export modal state
  const [exportModalProvider, setExportModalProvider] = useState<"shopify" | "woocommerce" | "squarespace" | null>(null);
  const [exportConnectionId, setExportConnectionId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProducts, setExportProducts] = useState<ExportableProduct[]>([]);
  const [exportSelected, setExportSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  // Webhook registration state
  const [registeringWebhooks, setRegisteringWebhooks] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const [xeroRes, sageRes, qbRes, shopifyRes, wooRes, sqRes] = await Promise.all([
        fetch("/api/integrations/xero/status"),
        fetch("/api/integrations/sage/status"),
        fetch("/api/integrations/quickbooks/status"),
        fetch("/api/integrations/shopify/status"),
        fetch("/api/integrations/woocommerce/status"),
        fetch("/api/integrations/squarespace/status"),
      ]);
      const [xeroData, sageData, qbData, shopifyData, wooData, sqData] = await Promise.all([
        xeroRes.json(),
        sageRes.json(),
        qbRes.json(),
        shopifyRes.json(),
        wooRes.json(),
        sqRes.json(),
      ]);
      setXeroStatus(xeroData);
      setSageStatus(sageData);
      setQuickbooksStatus(qbData);
      setShopifyStatus(shopifyData);
      setWooStatus(wooData);
      setSqStatus(sqData);

      // Fetch unmapped count if any ecommerce connection exists
      if (shopifyData.connected || wooData.connected || sqData.connected) {
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
  }, [loadStatus]);

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

  async function handleEcomDisconnect(provider: "shopify" | "woocommerce" | "squarespace") {
    const label = provider === "shopify" ? "Shopify" : provider === "woocommerce" ? "WooCommerce" : "Squarespace";
    if (!confirm(`Disconnect ${label}? This will stop all ecommerce syncing and remove webhooks.`))
      return;
    setEcomDisconnecting(provider);
    try {
      await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
      const setter = provider === "shopify" ? setShopifyStatus : provider === "woocommerce" ? setWooStatus : setSqStatus;
      setter({ connected: false });
    } finally {
      setEcomDisconnecting(null);
    }
  }

  async function handleEcomToggleSync(
    provider: "shopify" | "woocommerce" | "squarespace",
    key: "sync_products" | "sync_orders" | "sync_stock"
  ) {
    const status = provider === "shopify" ? shopifyStatus : provider === "woocommerce" ? wooStatus : sqStatus;
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
        const setter = provider === "shopify" ? setShopifyStatus : provider === "woocommerce" ? setWooStatus : setSqStatus;
        setter((prev) => (prev ? { ...prev, [key]: newValue } : prev));
      }
    } finally {
      setEcomToggling(null);
    }
  }

  async function handleWooConnect() {
    if (!wooStoreUrl || !wooConsumerKey || !wooConsumerSecret) {
      setWooError("All fields are required.");
      return;
    }
    setWooConnecting(true);
    setWooError(null);
    try {
      const res = await fetch("/api/integrations/woocommerce/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_url: wooStoreUrl,
          consumer_key: wooConsumerKey,
          consumer_secret: wooConsumerSecret,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWooError(data.error || "Connection failed.");
        return;
      }
      setSuccessMessage("WooCommerce connected successfully!");
      setTimeout(() => setSuccessMessage(null), 5000);
      setShowWooForm(false);
      setWooStoreUrl("");
      setWooConsumerKey("");
      setWooConsumerSecret("");
      // Reload ecommerce status
      const wooRes = await fetch("/api/integrations/woocommerce/status");
      const wooData = await wooRes.json();
      setWooStatus(wooData);
    } catch {
      setWooError("Could not connect. Please check your details and try again.");
    } finally {
      setWooConnecting(false);
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

  async function handleOpenImportModal(
    provider: "shopify" | "woocommerce" | "squarespace",
    connectionId: string
  ) {
    setImportModalProvider(provider);
    setImportConnectionId(connectionId);
    setImportLoading(true);
    setImportProducts([]);
    setImportSelected(new Set());
    setImportResult(null);

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
    provider: "shopify" | "woocommerce" | "squarespace",
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

  async function handleRegisterWebhooks(provider: "shopify" | "woocommerce" | "squarespace") {
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
    provider: "shopify" | "woocommerce" | "squarespace",
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

            {provider === "woocommerce" && !showWooForm && (
              <>
                <button
                  onClick={() => setShowWooForm(true)}
                  className={`inline-flex items-center gap-2 px-4 py-2 ${config.bgColor} text-white rounded-lg text-sm font-semibold ${config.hoverColor} transition-colors`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Connect {config.label}
                </button>
                <p className="text-xs text-slate-400 mt-2">
                  Enter your WooCommerce REST API credentials to connect.
                </p>
              </>
            )}

            {provider === "woocommerce" && showWooForm && (
              <div className="space-y-3">
                {wooError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{wooError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Store URL
                  </label>
                  <input
                    type="text"
                    value={wooStoreUrl}
                    onChange={(e) => setWooStoreUrl(e.target.value)}
                    placeholder="mystore.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Consumer Key
                  </label>
                  <input
                    type="text"
                    value={wooConsumerKey}
                    onChange={(e) => setWooConsumerKey(e.target.value)}
                    placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Consumer Secret
                  </label>
                  <div className="relative">
                    <input
                      type={wooShowSecret ? "text" : "password"}
                      value={wooConsumerSecret}
                      onChange={(e) => setWooConsumerSecret(e.target.value)}
                      placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setWooShowSecret(!wooShowSecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {wooShowSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleWooConnect}
                    disabled={wooConnecting}
                    className={`inline-flex items-center gap-2 px-4 py-2 ${config.bgColor} text-white rounded-lg text-sm font-semibold ${config.hoverColor} transition-colors disabled:opacity-50`}
                  >
                    {wooConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {wooConnecting ? "Connecting..." : "Test & Connect"}
                  </button>
                  <button
                    onClick={() => {
                      setShowWooForm(false);
                      setWooStoreUrl("");
                      setWooConsumerKey("");
                      setWooConsumerSecret("");
                      setWooError(null);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Generate API keys in WooCommerce &rarr; Settings &rarr; Advanced &rarr; REST API. Use &ldquo;Read/Write&rdquo; permissions.
                </p>
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
                  Enter your Squarespace Commerce API key to connect.
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
                  Generate an API key in Squarespace &rarr; Settings &rarr; Developer Tools &rarr; API Keys. Grant &ldquo;Commerce&rdquo; permissions.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

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
        <h2 className="text-lg font-semibold text-slate-900">Accounting</h2>
        <p className="text-sm text-slate-500 mt-1">
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

      {/* Ecommerce section */}
      <div className="mt-8 mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Ecommerce</h2>
        <p className="text-sm text-slate-500 mt-1">
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

        {renderEcommerceCard("woocommerce", wooStatus, {
          label: "WooCommerce",
          description:
            "Sync products, orders, and stock levels with your WooCommerce store.",
          bgColor: "bg-[#7F54B3]",
          hoverColor: "hover:bg-[#6b479a]",
          icon: <Store className="w-6 h-6 text-white" />,
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
      {(shopifyStatus?.connected || wooStatus?.connected || sqStatus?.connected) && (
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

      {/* Import Products Modal */}
      {importModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Import Products from{" "}
                  {importModalProvider === "shopify" ? "Shopify" : importModalProvider === "woocommerce" ? "WooCommerce" : "Squarespace"}
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

              {!importLoading && !importResult && importProducts.length > 0 && (
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
                  setImportModalProvider(null);
                  setImportResult(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {importResult ? "Done" : "Cancel"}
              </button>

              {!importResult && !importLoading && importProducts.length > 0 && (
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
                  {exportModalProvider === "shopify" ? "Shopify" : exportModalProvider === "woocommerce" ? "WooCommerce" : "Squarespace"}
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

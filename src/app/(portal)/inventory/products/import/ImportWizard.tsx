"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  Upload,
  FileText,
  Download,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
} from "@/components/icons";
import { CsvFieldMapper, type FieldOption } from "@/components/products/CsvFieldMapper";
import { ImportPreview } from "@/components/products/ImportPreview";
import { StockMapping, type ProductStockMapping } from "@/components/products/StockMapping";
import { autoMapHeaders, csvToNormalisedProducts, type GRField } from "@/lib/csv-import";
import type { NormalisedProduct, ImportResult } from "@/lib/product-import";

const GR_FIELD_OPTIONS: FieldOption<GRField>[] = [
  { value: "ignore", label: "\u2014 Ignore \u2014", group: "" },
  { value: "name", label: "Product Name", group: "Product" },
  { value: "description", label: "Description", group: "Product" },
  { value: "origin", label: "Origin", group: "Product" },
  { value: "tasting_notes", label: "Tasting Notes", group: "Product" },
  { value: "brand", label: "Brand", group: "Product" },
  { value: "image_url", label: "Image URL", group: "Product" },
  { value: "status", label: "Status", group: "Product" },
  { value: "is_retail", label: "Is Retail", group: "Product" },
  { value: "is_wholesale", label: "Is Wholesale", group: "Product" },
  { value: "minimum_wholesale_quantity", label: "Min Wholesale Qty", group: "Product" },
  { value: "sku", label: "SKU", group: "Variant" },
  { value: "retail_price", label: "Retail Price", group: "Variant" },
  { value: "wholesale_price", label: "Wholesale Price", group: "Variant" },
  { value: "weight", label: "Weight", group: "Variant" },
  { value: "grind_type", label: "Grind Type", group: "Variant" },
  { value: "retail_stock_count", label: "Stock Count", group: "Variant" },
  { value: "track_stock", label: "Track Stock", group: "Variant" },
  { value: "option1_name", label: "Option 1 Name", group: "Variant" },
  { value: "option1_value", label: "Option 1 Value", group: "Variant" },
  { value: "option2_name", label: "Option 2 Name", group: "Variant" },
  { value: "option2_value", label: "Option 2 Value", group: "Variant" },
  { value: "gtin", label: "GTIN / Barcode", group: "Meta" },
  { value: "vat_rate", label: "VAT Rate", group: "Meta" },
  { value: "meta_description", label: "Meta Description", group: "Meta" },
];

type Step = "upload" | "map" | "stock" | "preview" | "importing" | "done";

const STEP_LABELS: Record<Step, string> = {
  upload: "Upload",
  map: "Map Fields",
  stock: "Stock Mapping",
  preview: "Review",
  importing: "Importing",
  done: "Done",
};

// Steps that appear in the visible indicator (importing is hidden)
const VISIBLE_STEPS_COFFEE: Step[] = ["upload", "map", "stock", "preview", "done"];
const VISIBLE_STEPS_OTHER: Step[] = ["upload", "map", "preview", "done"];

// Full step order for navigation
const STEP_ORDER_COFFEE: Step[] = ["upload", "map", "stock", "preview", "importing", "done"];
const STEP_ORDER_OTHER: Step[] = ["upload", "map", "preview", "importing", "done"];

export function ImportWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, GRField>>({});
  const [category, setCategory] = useState<"coffee" | "other">("coffee");
  const [defaultIsRetail, setDefaultIsRetail] = useState(true);
  const [defaultIsWholesale, setDefaultIsWholesale] = useState(false);

  // Parsed products (set after map step, used by stock + preview)
  const [parsedProducts, setParsedProducts] = useState<NormalisedProduct[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  // Stock mapping state
  const [stockMappings, setStockMappings] = useState<Record<string, ProductStockMapping>>({});

  // Preview state (products with stock mappings applied)
  const [previewProducts, setPreviewProducts] = useState<NormalisedProduct[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);

  // Import result state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const isCoffee = category === "coffee";
  const visibleSteps = isCoffee ? VISIBLE_STEPS_COFFEE : VISIBLE_STEPS_OTHER;
  const stepOrder = isCoffee ? STEP_ORDER_COFFEE : STEP_ORDER_OTHER;

  // ─── File handling ────────────────────────────────────

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setCsvText(text);

        const parsed = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
          preview: 5,
          transformHeader: (h) => h.trim(),
        });

        if (parsed.meta.fields) {
          const headers = parsed.meta.fields;
          setCsvHeaders(headers);
          setSampleRows(parsed.data.slice(0, 3));

          const autoMapping = autoMapHeaders(headers);
          for (const h of headers) {
            if (!autoMapping[h]) {
              autoMapping[h] = "ignore";
            }
          }
          setMapping(autoMapping);
          setStep("map");
        }
      };
      reader.readAsText(file);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        fileInputRef.current.dispatchEvent(
          new Event("change", { bubbles: true })
        );
      }
    },
    []
  );

  // ─── Parse CSV into products ──────────────────────────

  const parseProducts = useCallback(() => {
    const { products, errors } = csvToNormalisedProducts({
      csvText,
      mapping,
      defaultCategory: category,
      defaultIsRetail,
      defaultIsWholesale,
    });
    setParsedProducts(products);
    setParseErrors(errors);
    return { products, errors };
  }, [csvText, mapping, category, defaultIsRetail, defaultIsWholesale]);

  // ─── Apply stock mappings to products ─────────────────

  function applyStockMappings(products: NormalisedProduct[]): NormalisedProduct[] {
    return products.map((p) => {
      const sm = stockMappings[p.external_id];
      if (!sm) return p;
      return {
        ...p,
        roasted_stock_id: sm.is_blend ? null : sm.roasted_stock_id,
        green_bean_id: sm.green_bean_id,
        is_blend: sm.is_blend,
        blend_components: sm.is_blend ? sm.blend_components : undefined,
      };
    });
  }

  // ─── Step navigation ──────────────────────────────────

  const goFromMapStep = useCallback(() => {
    const { products, errors } = parseProducts();
    if (isCoffee) {
      // Go to stock mapping step
      setStep("stock");
    } else {
      // Skip stock step for non-coffee, go straight to preview
      setPreviewProducts(products);
      setPreviewErrors(errors);
      setStep("preview");
    }
  }, [parseProducts, isCoffee]);

  const goToPreviewFromStock = useCallback(() => {
    const withStock = applyStockMappings(parsedProducts);
    setPreviewProducts(withStock);
    setPreviewErrors(parseErrors);
    setStep("preview");
  }, [parsedProducts, parseErrors, stockMappings]);

  const startImport = useCallback(async () => {
    setStep("importing");
    setImportError(null);

    // Apply stock mappings before sending
    const productsToImport = isCoffee
      ? applyStockMappings(parsedProducts)
      : parsedProducts;

    // Build stock mappings payload for the API
    const stockMappingsPayload = isCoffee ? stockMappings : undefined;

    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText,
          mapping,
          defaultCategory: category,
          defaultIsRetail,
          defaultIsWholesale,
          stockMappings: stockMappingsPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || "Import failed");
        setStep("preview");
        return;
      }

      setImportResult(data as ImportResult);
      setStep("done");
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Import failed"
      );
      setStep("preview");
    }
  }, [csvText, mapping, category, defaultIsRetail, defaultIsWholesale, isCoffee, parsedProducts, stockMappings]);

  const nameIsMapped = Object.values(mapping).includes("name");

  // ─── Step indicator ───────────────────────────────────

  const currentStepIndex = stepOrder.indexOf(step);

  // Reset helper
  const resetAll = useCallback(() => {
    setStep("upload");
    setCsvText("");
    setFileName("");
    setCsvHeaders([]);
    setSampleRows([]);
    setMapping({});
    setParsedProducts([]);
    setParseErrors([]);
    setStockMappings({});
    setPreviewProducts([]);
    setPreviewErrors([]);
    setImportResult(null);
    setImportError(null);
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/products"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Import Products
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Import products from a CSV or spreadsheet file.
            </p>
          </div>
        </div>
        <a
          href={`/api/products/import/template?category=${category}`}
          download
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Template
        </a>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {visibleSteps.map((s, i) => {
          const si = stepOrder.indexOf(s);
          const isActive = si === currentStepIndex;
          // importing step counts as "preview done" for the indicator
          const isDone = si < currentStepIndex || (step === "importing" && si <= stepOrder.indexOf("preview"));
          const label = STEP_LABELS[s];

          return (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && (
                <div
                  className={`w-8 h-px ${
                    isDone ? "bg-brand-400" : "bg-slate-200"
                  }`}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    isDone
                      ? "bg-brand-600 text-white"
                      : isActive
                        ? "bg-brand-100 text-brand-700 ring-2 ring-brand-400"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {/* ─── Upload Step ─── */}
        {step === "upload" && (
          <div>
            {/* Category toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Product Category
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCategory("coffee")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    category === "coffee"
                      ? "bg-brand-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Coffee
                </button>
                <button
                  onClick={() => setCategory("other")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    category === "other"
                      ? "bg-brand-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Other Products
                </button>
              </div>
            </div>

            {/* Default channel toggles */}
            <div className="mb-6 flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={defaultIsRetail}
                  onChange={(e) => setDefaultIsRetail(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-700">Retail by default</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={defaultIsWholesale}
                  onChange={(e) => setDefaultIsWholesale(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-700">Wholesale by default</span>
              </label>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:border-brand-300 hover:bg-brand-50/30 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">
                Drop your CSV file here, or click to browse
              </p>
              <p className="text-xs text-slate-400">
                Supports .csv files. Rows sharing the same Product Name will be grouped as variants.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* ─── Map Step ─── */}
        {step === "map" && (
          <div>
            <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
              <FileText className="w-4 h-4" />
              <span>{fileName}</span>
              <span className="text-slate-300">•</span>
              <span>{sampleRows.length > 0 ? `${csvHeaders.length} columns detected` : ""}</span>
            </div>

            <CsvFieldMapper<GRField>
              csvHeaders={csvHeaders}
              sampleRows={sampleRows}
              mapping={mapping}
              onMappingChange={setMapping}
              fieldOptions={GR_FIELD_OPTIONS}
              requiredField="name"
              requiredFieldLabel="Product Name"
            />

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setStep("upload");
                  setCsvText("");
                  setFileName("");
                  setCsvHeaders([]);
                  setSampleRows([]);
                  setMapping({});
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={goFromMapStep}
                disabled={!nameIsMapped}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCoffee ? "Stock Mapping" : "Review Import"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Stock Mapping Step ─── */}
        {step === "stock" && (
          <div>
            <StockMapping
              products={parsedProducts}
              stockMappings={stockMappings}
              onMappingsChange={setStockMappings}
            />

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep("map")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Mapping
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Skip — clear stock mappings and go to preview
                    setStockMappings({});
                    setPreviewProducts(parsedProducts);
                    setPreviewErrors(parseErrors);
                    setStep("preview");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={goToPreviewFromStock}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
                >
                  Review Import
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Preview Step ─── */}
        {step === "preview" && (
          <div>
            {importError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{importError}</p>
              </div>
            )}

            <ImportPreview
              products={previewProducts}
              errors={previewErrors}
            />

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(isCoffee ? "stock" : "map")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {isCoffee ? "Back to Stock Mapping" : "Back to Mapping"}
              </button>
              <button
                onClick={startImport}
                disabled={previewProducts.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {previewProducts.length} Product{previewProducts.length !== 1 ? "s" : ""}
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Importing Step ─── */}
        {step === "importing" && (
          <div className="py-12 text-center">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-700">
              Importing products…
            </p>
            <p className="text-xs text-slate-400 mt-1">
              This may take a moment.
            </p>
          </div>
        )}

        {/* ─── Done Step ─── */}
        {step === "done" && importResult && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Import Complete
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {importResult.imported} imported, {importResult.skipped} skipped
              {importResult.errors.length > 0
                ? `, ${importResult.errors.length} error${importResult.errors.length !== 1 ? "s" : ""}`
                : ""}
            </p>

            {importResult.errors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-left max-w-md mx-auto">
                <h4 className="text-sm font-medium text-amber-800 mb-1">
                  Errors
                </h4>
                <ul className="text-xs text-amber-700 space-y-0.5">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push("/inventory/products")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                View Products
              </button>
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Import More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

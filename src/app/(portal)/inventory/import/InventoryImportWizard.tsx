"use client";

import { useState, useCallback, useRef } from "react";
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
import { CsvFieldMapper } from "@/components/products/CsvFieldMapper";
import {
  GreenBeanImportPreview,
  RoastedStockImportPreview,
} from "@/components/inventory/InventoryImportPreview";
import { GreenBeanLinkMapping } from "@/components/inventory/GreenBeanLinkMapping";
import {
  GREEN_BEAN_FIELDS,
  ROASTED_STOCK_FIELDS,
  autoMapGreenBeanHeaders,
  autoMapRoastedStockHeaders,
  csvToNormalisedGreenBeans,
  csvToNormalisedRoastedStock,
  type GreenBeanField,
  type RoastedStockField,
  type NormalisedGreenBean,
  type NormalisedRoastedStock,
  type InventoryImportResult,
} from "@/lib/inventory-import";

type InventoryType = "green_beans" | "roasted_stock";
type Step = "upload" | "map" | "link" | "preview" | "importing" | "done";

const STEP_LABELS: Record<Step, string> = {
  upload: "Upload",
  map: "Map Fields",
  link: "Link Green Beans",
  preview: "Preview",
  importing: "Importing",
  done: "Done",
};

// Green beans: no link step
const VISIBLE_STEPS_GB: Step[] = ["upload", "map", "preview", "done"];
const STEP_ORDER_GB: Step[] = ["upload", "map", "preview", "importing", "done"];

// Roasted stock: includes link step
const VISIBLE_STEPS_RS: Step[] = ["upload", "map", "link", "preview", "done"];
const STEP_ORDER_RS: Step[] = ["upload", "map", "link", "preview", "importing", "done"];

export function InventoryImportWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [inventoryType, setInventoryType] = useState<InventoryType>("green_beans");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Parsed data
  const [parsedBeans, setParsedBeans] = useState<NormalisedGreenBean[]>([]);
  const [parsedStock, setParsedStock] = useState<NormalisedRoastedStock[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  // Green bean link mappings (roasted stock only) — index → green_bean_id
  const [greenBeanMappings, setGreenBeanMappings] = useState<Record<number, string>>({});

  // Import result
  const [importResult, setImportResult] = useState<InventoryImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const isGreenBeans = inventoryType === "green_beans";
  const visibleSteps = isGreenBeans ? VISIBLE_STEPS_GB : VISIBLE_STEPS_RS;
  const stepOrder = isGreenBeans ? STEP_ORDER_GB : STEP_ORDER_RS;

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

          const autoMapping = isGreenBeans
            ? autoMapGreenBeanHeaders(headers)
            : autoMapRoastedStockHeaders(headers);

          for (const h of headers) {
            if (!autoMapping[h]) {
              (autoMapping as Record<string, string>)[h] = "ignore";
            }
          }
          setMapping(autoMapping);
          setStep("map");
        }
      };
      reader.readAsText(file);
    },
    [isGreenBeans]
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

  // ─── Parse CSV ────────────────────────────────────────

  const parseData = useCallback(() => {
    if (isGreenBeans) {
      const { beans, errors } = csvToNormalisedGreenBeans({
        csvText,
        mapping: mapping as Record<string, GreenBeanField>,
      });
      setParsedBeans(beans);
      setParsedStock([]);
      setParseErrors(errors);
      return { count: beans.length, errors };
    } else {
      const { stock, errors } = csvToNormalisedRoastedStock({
        csvText,
        mapping: mapping as Record<string, RoastedStockField>,
      });
      setParsedStock(stock);
      setParsedBeans([]);
      setParseErrors(errors);
      return { count: stock.length, errors };
    }
  }, [csvText, mapping, isGreenBeans]);

  // ─── Step navigation ──────────────────────────────────

  const goFromMapStep = useCallback(() => {
    parseData();
    if (isGreenBeans) {
      setStep("preview");
    } else {
      // Roasted stock — go to link step
      setStep("link");
    }
  }, [parseData, isGreenBeans]);

  const goToPreviewFromLink = useCallback(() => {
    setStep("preview");
  }, []);

  const startImport = useCallback(async () => {
    setStep("importing");
    setImportError(null);

    try {
      const res = await fetch("/api/tools/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText,
          mapping,
          type: inventoryType,
          greenBeanMappings: !isGreenBeans ? greenBeanMappings : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || "Import failed");
        setStep("preview");
        return;
      }

      setImportResult(data as InventoryImportResult);
      setStep("done");
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Import failed"
      );
      setStep("preview");
    }
  }, [csvText, mapping, inventoryType, isGreenBeans, greenBeanMappings]);

  const nameIsMapped = Object.values(mapping).includes("name");
  const recordCount = isGreenBeans ? parsedBeans.length : parsedStock.length;

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
    setParsedBeans([]);
    setParsedStock([]);
    setParseErrors([]);
    setGreenBeanMappings({});
    setImportResult(null);
    setImportError(null);
  }, []);

  const handleTypeChange = useCallback((type: InventoryType) => {
    setInventoryType(type);
    setCsvText("");
    setFileName("");
    setCsvHeaders([]);
    setSampleRows([]);
    setMapping({});
    setParsedBeans([]);
    setParsedStock([]);
    setParseErrors([]);
    setGreenBeanMappings({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Import Inventory
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Import {isGreenBeans ? "green beans" : "roasted stock"} from a CSV file.
          </p>
        </div>
        <a
          href={`/api/tools/inventory/import/template?type=${inventoryType}`}
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
          const isDone =
            si < currentStepIndex ||
            (step === "importing" && si <= stepOrder.indexOf("preview"));
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
            {/* Type toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Inventory Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTypeChange("green_beans")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inventoryType === "green_beans"
                      ? "bg-brand-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Green Beans
                </button>
                <button
                  onClick={() => handleTypeChange("roasted_stock")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inventoryType === "roasted_stock"
                      ? "bg-brand-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Roasted Stock
                </button>
              </div>
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
                Supports .csv files. Each row will create one{" "}
                {isGreenBeans ? "green bean" : "roasted stock"} record.
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
              <span className="text-slate-300">&bull;</span>
              <span>
                {sampleRows.length > 0
                  ? `${csvHeaders.length} columns detected`
                  : ""}
              </span>
            </div>

            {isGreenBeans ? (
              <CsvFieldMapper<GreenBeanField>
                csvHeaders={csvHeaders}
                sampleRows={sampleRows}
                mapping={mapping as Record<string, GreenBeanField>}
                onMappingChange={(m) => setMapping(m)}
                fieldOptions={GREEN_BEAN_FIELDS}
                requiredField="name"
                requiredFieldLabel="Bean Name"
              />
            ) : (
              <CsvFieldMapper<RoastedStockField>
                csvHeaders={csvHeaders}
                sampleRows={sampleRows}
                mapping={mapping as Record<string, RoastedStockField>}
                onMappingChange={(m) => setMapping(m)}
                fieldOptions={ROASTED_STOCK_FIELDS}
                requiredField="name"
                requiredFieldLabel="Stock Name"
              />
            )}

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
                {isGreenBeans ? "Preview Import" : "Link Green Beans"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Link Green Beans Step (roasted stock only) ─── */}
        {step === "link" && (
          <div>
            <GreenBeanLinkMapping
              stock={parsedStock}
              greenBeanMappings={greenBeanMappings}
              onMappingsChange={setGreenBeanMappings}
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
                    setGreenBeanMappings({});
                    setStep("preview");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={goToPreviewFromLink}
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

            {isGreenBeans ? (
              <GreenBeanImportPreview
                beans={parsedBeans}
                errors={parseErrors}
              />
            ) : (
              <RoastedStockImportPreview
                stock={parsedStock}
                errors={parseErrors}
              />
            )}

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(isGreenBeans ? "map" : "link")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {isGreenBeans ? "Back to Mapping" : "Back to Green Bean Links"}
              </button>
              <button
                onClick={startImport}
                disabled={recordCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {recordCount}{" "}
                {isGreenBeans
                  ? `Bean${recordCount !== 1 ? "s" : ""}`
                  : `Stock Item${recordCount !== 1 ? "s" : ""}`}
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
              Importing {isGreenBeans ? "green beans" : "roasted stock"}&hellip;
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
                ? `, ${importResult.errors.length} warning${importResult.errors.length !== 1 ? "s" : ""}`
                : ""}
            </p>

            {importResult.errors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-left max-w-md mx-auto">
                <h4 className="text-sm font-medium text-amber-800 mb-1">
                  Warnings
                </h4>
                <ul className="text-xs text-amber-700 space-y-0.5 max-h-40 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>&bull; {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() =>
                  router.push(
                    isGreenBeans
                      ? "/tools/green-beans"
                      : "/tools/roasted-stock"
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                View {isGreenBeans ? "Green Beans" : "Roasted Stock"}
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

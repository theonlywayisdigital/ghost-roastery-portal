"use client";

import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  Upload,
  FileText,
  Download,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Info,
} from "@/components/icons";
import { CsvFieldMapper } from "@/components/products/CsvFieldMapper";
import { WholesaleImportPreview } from "@/components/wholesale/WholesaleImportPreview";
import {
  WHOLESALE_FIELDS,
  autoMapWholesaleHeaders,
  csvToNormalisedWholesaleBuyers,
  type WholesaleField,
  type NormalisedWholesaleBuyer,
  type WholesaleImportResult,
} from "@/lib/wholesale-import";

type Step = "upload" | "map" | "preview" | "importing" | "done";

const STEP_LABELS: Record<Step, string> = {
  upload: "Upload",
  map: "Map Fields",
  preview: "Preview",
  importing: "Importing",
  done: "Done",
};

const VISIBLE_STEPS: Step[] = ["upload", "map", "preview", "done"];
const STEP_ORDER: Step[] = ["upload", "map", "preview", "importing", "done"];

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

export function WholesaleImportWizard({ onComplete, onCancel }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, WholesaleField>>({});

  // Parsed data
  const [parsedBuyers, setParsedBuyers] = useState<NormalisedWholesaleBuyer[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  // Import result
  const [importResult, setImportResult] = useState<WholesaleImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const currentStepIndex = STEP_ORDER.indexOf(step);

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

          const autoMapping = autoMapWholesaleHeaders(headers);
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

  const handleDrop = useCallback((e: React.DragEvent) => {
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
  }, []);

  // ─── Parse CSV ────────────────────────────────────────

  const parseData = useCallback(() => {
    const { buyers, errors } = csvToNormalisedWholesaleBuyers({
      csvText,
      mapping,
    });
    setParsedBuyers(buyers);
    setParseErrors(errors);
    return { count: buyers.length, errors };
  }, [csvText, mapping]);

  // ─── Step navigation ──────────────────────────────────

  const goToPreview = useCallback(() => {
    parseData();
    setStep("preview");
  }, [parseData]);

  const startImport = useCallback(async () => {
    setStep("importing");
    setImportError(null);

    try {
      const res = await fetch("/api/wholesale-buyers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, mapping }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || "Import failed");
        setStep("preview");
        return;
      }

      setImportResult(data as WholesaleImportResult);
      setStep("done");
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Import failed"
      );
      setStep("preview");
    }
  }, [csvText, mapping]);

  const requiredFieldsMapped =
    Object.values(mapping).includes("email") &&
    (Object.values(mapping).includes("first_name") ||
      Object.values(mapping).includes("last_name")) &&
    Object.values(mapping).includes("business_name");

  // Reset helper
  const resetAll = useCallback(() => {
    setStep("upload");
    setCsvText("");
    setFileName("");
    setCsvHeaders([]);
    setSampleRows([]);
    setMapping({});
    setParsedBuyers([]);
    setParseErrors([]);
    setImportResult(null);
    setImportError(null);
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Import Wholesale Buyers
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Import wholesale buyers from a CSV file.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/wholesale-buyers/import/template"
            download
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </a>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Each imported buyer will receive an email invite to join your wholesale portal.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {VISIBLE_STEPS.map((s, i) => {
          const si = STEP_ORDER.indexOf(s);
          const isActive = si === currentStepIndex;
          const isDone =
            si < currentStepIndex ||
            (step === "importing" && si <= STEP_ORDER.indexOf("preview"));
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
                Supports .csv files. Each row will create one wholesale buyer
                record.
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

            <CsvFieldMapper<WholesaleField>
              csvHeaders={csvHeaders}
              sampleRows={sampleRows}
              mapping={mapping}
              onMappingChange={(m) => setMapping(m)}
              fieldOptions={WHOLESALE_FIELDS}
              requiredField="email"
              requiredFieldLabel="Email, Name & Business Name"
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
                onClick={goToPreview}
                disabled={!requiredFieldsMapped}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview Import
                <ArrowRight className="w-4 h-4" />
              </button>
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

            <WholesaleImportPreview
              buyers={parsedBuyers}
              errors={parseErrors}
            />

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep("map")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={startImport}
                disabled={parsedBuyers.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {parsedBuyers.length} Buyer
                {parsedBuyers.length !== 1 ? "s" : ""}
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
              Importing wholesale buyers&hellip;
            </p>
            <p className="text-xs text-slate-400 mt-1">
              This may take a moment. Invite emails will be sent to each buyer.
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
              {importResult.emailsFailed > 0
                ? `, ${importResult.emailsFailed} invite email${importResult.emailsFailed !== 1 ? "s" : ""} failed`
                : ""}
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
                onClick={onComplete}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                View Wholesale Buyers
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

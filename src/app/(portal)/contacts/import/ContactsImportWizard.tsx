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
  ContactImportPreview,
  BusinessImportPreview,
} from "@/components/contacts/ContactsImportPreview";
import { BusinessLinkMapping } from "@/components/contacts/BusinessLinkMapping";
import {
  CONTACT_FIELDS,
  BUSINESS_FIELDS,
  autoMapContactHeaders,
  autoMapBusinessHeaders,
  csvToNormalisedContacts,
  csvToNormalisedBusinesses,
  type ContactField,
  type BusinessField,
  type NormalisedContact,
  type NormalisedBusiness,
  type ContactsImportResult,
} from "@/lib/contacts-import";

type ImportType = "contacts" | "businesses";
type Step = "upload" | "map" | "link" | "preview" | "importing" | "done";

const STEP_LABELS: Record<Step, string> = {
  upload: "Upload",
  map: "Map Fields",
  link: "Link Businesses",
  preview: "Preview",
  importing: "Importing",
  done: "Done",
};

// People: includes link step
const VISIBLE_STEPS_CONTACTS: Step[] = ["upload", "map", "link", "preview", "done"];
const STEP_ORDER_CONTACTS: Step[] = ["upload", "map", "link", "preview", "importing", "done"];

// Businesses: no link step
const VISIBLE_STEPS_BIZ: Step[] = ["upload", "map", "preview", "done"];
const STEP_ORDER_BIZ: Step[] = ["upload", "map", "preview", "importing", "done"];

export function ContactsImportWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [importType, setImportType] = useState<ImportType>("contacts");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Parsed data
  const [parsedContacts, setParsedContacts] = useState<NormalisedContact[]>([]);
  const [parsedBusinesses, setParsedBusinesses] = useState<NormalisedBusiness[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  // Business link mappings (contacts only) — normalised name → business_id or "create"
  const [businessMappings, setBusinessMappings] = useState<Record<string, string>>({});

  // Import result
  const [importResult, setImportResult] = useState<ContactsImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const isContacts = importType === "contacts";
  const visibleSteps = isContacts ? VISIBLE_STEPS_CONTACTS : VISIBLE_STEPS_BIZ;
  const stepOrder = isContacts ? STEP_ORDER_CONTACTS : STEP_ORDER_BIZ;

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

          const autoMapping = isContacts
            ? autoMapContactHeaders(headers)
            : autoMapBusinessHeaders(headers);

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
    [isContacts]
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
    if (isContacts) {
      const { contacts, errors } = csvToNormalisedContacts({
        csvText,
        mapping: mapping as Record<string, ContactField>,
      });
      setParsedContacts(contacts);
      setParsedBusinesses([]);
      setParseErrors(errors);
      return { count: contacts.length, errors };
    } else {
      const { businesses, errors } = csvToNormalisedBusinesses({
        csvText,
        mapping: mapping as Record<string, BusinessField>,
      });
      setParsedBusinesses(businesses);
      setParsedContacts([]);
      setParseErrors(errors);
      return { count: businesses.length, errors };
    }
  }, [csvText, mapping, isContacts]);

  // ─── Step navigation ──────────────────────────────────

  const goFromMapStep = useCallback(() => {
    parseData();
    if (isContacts) {
      // Check if any contacts have business names
      const { contacts } = csvToNormalisedContacts({
        csvText,
        mapping: mapping as Record<string, ContactField>,
      });
      const hasBizNames = contacts.some((c) => c.business_name);
      if (hasBizNames) {
        setStep("link");
      } else {
        setStep("preview");
      }
    } else {
      setStep("preview");
    }
  }, [parseData, isContacts, csvText, mapping]);

  const goToPreviewFromLink = useCallback(() => {
    setStep("preview");
  }, []);

  const startImport = useCallback(async () => {
    setStep("importing");
    setImportError(null);

    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText,
          mapping,
          type: importType,
          businessMappings: isContacts ? businessMappings : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || "Import failed");
        setStep("preview");
        return;
      }

      setImportResult(data as ContactsImportResult);
      setStep("done");
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Import failed"
      );
      setStep("preview");
    }
  }, [csvText, mapping, importType, isContacts, businessMappings]);

  const requiredFieldMapped = isContacts
    ? Object.values(mapping).includes("first_name") ||
      Object.values(mapping).includes("last_name") ||
      Object.values(mapping).includes("email")
    : Object.values(mapping).includes("name");

  const recordCount = isContacts
    ? parsedContacts.length
    : parsedBusinesses.length;

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
    setParsedContacts([]);
    setParsedBusinesses([]);
    setParseErrors([]);
    setBusinessMappings({});
    setImportResult(null);
    setImportError(null);
  }, []);

  const handleTypeChange = useCallback((type: ImportType) => {
    setImportType(type);
    setCsvText("");
    setFileName("");
    setCsvHeaders([]);
    setSampleRows([]);
    setMapping({});
    setParsedContacts([]);
    setParsedBusinesses([]);
    setParseErrors([]);
    setBusinessMappings({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Import {isContacts ? "Contacts" : "Businesses"}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Import {isContacts ? "contacts" : "businesses"} from a CSV file.
          </p>
        </div>
        <a
          href={`/api/contacts/import/template?type=${importType}`}
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
                Import Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTypeChange("contacts")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    importType === "contacts"
                      ? "bg-brand-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  People
                </button>
                <button
                  onClick={() => handleTypeChange("businesses")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    importType === "businesses"
                      ? "bg-brand-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Businesses
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
                {isContacts ? "contact" : "business"} record.
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

            {isContacts ? (
              <CsvFieldMapper<ContactField>
                csvHeaders={csvHeaders}
                sampleRows={sampleRows}
                mapping={mapping as Record<string, ContactField>}
                onMappingChange={(m) => setMapping(m)}
                fieldOptions={CONTACT_FIELDS}
                requiredField="first_name"
                requiredFieldLabel="Name or Email"
              />
            ) : (
              <CsvFieldMapper<BusinessField>
                csvHeaders={csvHeaders}
                sampleRows={sampleRows}
                mapping={mapping as Record<string, BusinessField>}
                onMappingChange={(m) => setMapping(m)}
                fieldOptions={BUSINESS_FIELDS}
                requiredField="name"
                requiredFieldLabel="Business Name"
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
                disabled={!requiredFieldMapped}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isContacts ? "Next" : "Preview Import"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Link Businesses Step (contacts only) ─── */}
        {step === "link" && (
          <div>
            <BusinessLinkMapping
              contacts={parsedContacts}
              businessMappings={businessMappings}
              onMappingsChange={setBusinessMappings}
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
                    setBusinessMappings({});
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

            {isContacts ? (
              <ContactImportPreview
                contacts={parsedContacts}
                errors={parseErrors}
              />
            ) : (
              <BusinessImportPreview
                businesses={parsedBusinesses}
                errors={parseErrors}
              />
            )}

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  if (isContacts) {
                    const hasBizNames = parsedContacts.some(
                      (c) => c.business_name
                    );
                    setStep(hasBizNames ? "link" : "map");
                  } else {
                    setStep("map");
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={startImport}
                disabled={recordCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {recordCount}{" "}
                {isContacts
                  ? `Contact${recordCount !== 1 ? "s" : ""}`
                  : `Business${recordCount !== 1 ? "es" : ""}`}
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
              Importing {isContacts ? "contacts" : "businesses"}&hellip;
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
                onClick={() => router.push("/contacts")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                View {isContacts ? "Contacts" : "Businesses"}
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

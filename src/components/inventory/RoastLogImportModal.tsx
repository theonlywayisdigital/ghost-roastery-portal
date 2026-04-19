"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Save,
} from "@/components/icons";
import { CsvFieldMapper } from "@/components/products/CsvFieldMapper";
import {
  ROAST_LOG_FIELDS,
  autoMapRoastLogHeaders,
  parseRoastLogRows,
  type RoastLogField,
  type NormalisedRoastLog,
  type RoastLogImportResult,
} from "@/lib/roast-log-import";

// ─── Types ───────────────────────────────────────────────────

type Step = "upload" | "map" | "match" | "preview" | "importing" | "done";

interface SavedMapping {
  id: string;
  name: string;
  header_fingerprint: string[];
  mapping: Record<string, string>;
  created_at: string;
}

interface RoastedStock {
  id: string;
  name: string;
  green_bean_id: string | null;
}

interface ProfileMatch {
  roasted_stock_id: string;
  green_bean_id: string | null;
}

// ─── Constants ───────────────────────────────────────────────

const VISIBLE_STEPS: Step[] = ["upload", "map", "match", "preview", "done"];
const STEP_ORDER: Step[] = ["upload", "map", "match", "preview", "importing", "done"];

const STEP_LABELS: Record<Step, string> = {
  upload: "Upload",
  map: "Map Fields",
  match: "Match Profiles",
  preview: "Preview",
  importing: "Importing",
  done: "Done",
};

// ─── Component ───────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function RoastLogImportModal({ open, onClose, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [step, setStep] = useState<Step>("upload");

  // File parsing
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, RoastLogField>>({});

  // Saved mappings
  const [savedMappings, setSavedMappings] = useState<SavedMapping[]>([]);
  const [savedMappingsLoaded, setSavedMappingsLoaded] = useState(false);
  const [saveMapping, setSaveMapping] = useState(false);
  const [saveMappingName, setSaveMappingName] = useState("");
  const [appliedSavedMappingId, setAppliedSavedMappingId] = useState<string | null>(null);

  // Parsed & matched data
  const [parsedLogs, setParsedLogs] = useState<NormalisedRoastLog[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [roastedStocks, setRoastedStocks] = useState<RoastedStock[]>([]);
  const [stocksLoaded, setStocksLoaded] = useState(false);
  const [profileMatches, setProfileMatches] = useState<Record<string, ProfileMatch | null>>({});

  // Import
  const [importResult, setImportResult] = useState<RoastLogImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Load saved mappings on mount
  useEffect(() => {
    if (!open || savedMappingsLoaded) return;
    fetch("/api/tools/roast-log/import/mappings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.mappings) setSavedMappings(d.mappings); })
      .catch(() => {})
      .finally(() => setSavedMappingsLoaded(true));
  }, [open, savedMappingsLoaded]);

  // Load roasted stocks for profile matching
  useEffect(() => {
    if (stocksLoaded) return;
    fetch("/api/tools/roasted-stock")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.roastedStocks) {
          setRoastedStocks(
            (d.roastedStocks as RoastedStock[])
              .filter((s: RoastedStock & { is_active?: boolean }) => s.is_active !== false)
              .map((s: RoastedStock) => ({ id: s.id, name: s.name, green_bean_id: s.green_bean_id }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setStocksLoaded(true));
  }, [stocksLoaded]);

  // ─── File handling ────────────────────────────────────────

  const processFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const isExcel = /\.(xlsx?|xls)$/i.test(file.name);

      const reader = new FileReader();
      reader.onload = (ev) => {
        let rows: Record<string, string>[] = [];
        let fileHeaders: string[] = [];

        if (isExcel) {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const jsonRows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false, defval: "" });
          if (jsonRows.length > 0) {
            fileHeaders = Object.keys(jsonRows[0]).map((h) => h.trim());
            rows = jsonRows.map((r) => {
              const cleaned: Record<string, string> = {};
              for (const [k, v] of Object.entries(r)) {
                cleaned[k.trim()] = String(v ?? "").trim();
              }
              return cleaned;
            });
          }
        } else {
          // CSV: use simple split
          const text = ev.target?.result as string;
          const lines = text.split(/\r?\n/).filter((l) => l.trim());
          if (lines.length > 0) {
            fileHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
            rows = lines.slice(1).map((line) => {
              const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
              const obj: Record<string, string> = {};
              fileHeaders.forEach((h, i) => { obj[h] = vals[i] || ""; });
              return obj;
            });
          }
        }

        if (fileHeaders.length === 0) return;

        setHeaders(fileHeaders);
        setAllRows(rows);
        setSampleRows(rows.slice(0, 5));

        // Check for matching saved mapping
        const fingerprint = JSON.stringify(fileHeaders);
        const match = savedMappings.find(
          (m) => JSON.stringify(m.header_fingerprint) === fingerprint
        );

        if (match) {
          // Auto-apply saved mapping
          const applied: Record<string, RoastLogField> = {};
          for (const h of fileHeaders) {
            applied[h] = (match.mapping[h] as RoastLogField) || "ignore";
          }
          setMapping(applied);
          setAppliedSavedMappingId(match.id);
        } else {
          // Auto-detect from aliases
          const auto = autoMapRoastLogHeaders(fileHeaders);
          for (const h of fileHeaders) {
            if (!auto[h]) auto[h] = "ignore";
          }
          setMapping(auto);
          setAppliedSavedMappingId(null);
        }

        setStep("map");
      };

      if (isExcel) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    },
    [savedMappings]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // ─── Parse & match ───────────────────────────────────────

  const parseData = useCallback(() => {
    const { logs, errors } = parseRoastLogRows(allRows, mapping);
    setParsedLogs(logs);
    setParseErrors(errors);
    return logs;
  }, [allRows, mapping]);

  const autoMatchProfiles = useCallback(
    (logs: NormalisedRoastLog[]) => {
      const profiles = Array.from(new Set(logs.map((l) => l.roast_profile)));
      const matches: Record<string, ProfileMatch | null> = {};

      for (const profileName of profiles) {
        const exact = roastedStocks.find(
          (s) => s.name.toLowerCase().trim() === profileName.toLowerCase().trim()
        );
        if (exact) {
          matches[profileName] = {
            roasted_stock_id: exact.id,
            green_bean_id: exact.green_bean_id,
          };
        } else {
          matches[profileName] = null;
        }
      }

      setProfileMatches(matches);
      return matches;
    },
    [roastedStocks]
  );

  const goFromMapStep = useCallback(() => {
    const logs = parseData();

    // Save mapping if requested
    if (saveMapping && saveMappingName.trim()) {
      fetch("/api/tools/roast-log/import/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveMappingName.trim(),
          header_fingerprint: headers,
          mapping,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.mapping) {
            setSavedMappings((prev) => [d.mapping, ...prev]);
          }
        })
        .catch(() => {});
    }

    const matches = autoMatchProfiles(logs);
    const hasUnmatched = Object.values(matches).some((m) => m === null);

    if (hasUnmatched) {
      setStep("match");
    } else {
      setStep("preview");
    }
  }, [parseData, autoMatchProfiles, saveMapping, saveMappingName, headers, mapping]);

  const goFromMatchStep = useCallback(() => {
    setStep("preview");
  }, []);

  // ─── Import ──────────────────────────────────────────────

  const startImport = useCallback(async () => {
    setStep("importing");
    setImportError(null);

    // Filter out skipped profiles and build the profile mapping
    const filteredLogs = parsedLogs.filter(
      (log) => profileMatches[log.roast_profile] !== null && profileMatches[log.roast_profile] !== undefined
    );

    // Build a clean profileMapping for the API
    const apiProfileMapping: Record<string, ProfileMatch> = {};
    for (const [name, match] of Object.entries(profileMatches)) {
      if (match) apiProfileMapping[name] = match;
    }

    try {
      const res = await fetch("/api/tools/roast-log/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: filteredLogs,
          profileMapping: apiProfileMapping,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || "Import failed");
        setStep("preview");
        return;
      }

      setImportResult(data as RoastLogImportResult);
      setStep("done");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    }
  }, [parsedLogs, profileMatches]);

  // ─── Reset ───────────────────────────────────────────────

  const resetAll = useCallback(() => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setAllRows([]);
    setSampleRows([]);
    setMapping({});
    setParsedLogs([]);
    setParseErrors([]);
    setProfileMatches({});
    setImportResult(null);
    setImportError(null);
    setSaveMapping(false);
    setSaveMappingName("");
    setAppliedSavedMappingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = useCallback(() => {
    if (step === "done") onImported();
    resetAll();
    onClose();
  }, [step, onClose, onImported, resetAll]);

  const deleteSavedMapping = useCallback(async (id: string) => {
    await fetch(`/api/tools/roast-log/import/mappings?id=${id}`, { method: "DELETE" });
    setSavedMappings((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ─── Derived data ────────────────────────────────────────

  const requiredMapped = (() => {
    const vals = new Set(Object.values(mapping));
    return vals.has("roast_profile") && vals.has("roast_date") && vals.has("green_weight_kg") && vals.has("roasted_weight_kg");
  })();

  const currentStepIndex = STEP_ORDER.indexOf(step);
  const uniqueProfiles = Array.from(new Set(parsedLogs.map((l) => l.roast_profile)));
  const unmatchedProfiles = uniqueProfiles.filter((p) => !profileMatches[p]);
  const matchedCount = uniqueProfiles.filter((p) => profileMatches[p]).length;
  const skippedLogCount = parsedLogs.filter((l) => profileMatches[l.roast_profile] === null).length;
  const importableCount = parsedLogs.filter((l) => profileMatches[l.roast_profile]).length;

  if (!open) return null;

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Import Roast Logs</h2>
            <p className="text-sm text-slate-500 mt-0.5">Import roast logs from CSV or Excel files</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-100">
          {VISIBLE_STEPS.map((s, i) => {
            const si = STEP_ORDER.indexOf(s);
            const isActive = si === currentStepIndex;
            const isDone = si < currentStepIndex || (step === "importing" && si <= STEP_ORDER.indexOf("preview"));
            return (
              <div key={s} className="flex items-center gap-1">
                {i > 0 && <div className={`w-6 h-px ${isDone ? "bg-brand-400" : "bg-slate-200"}`} />}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
                      isDone
                        ? "bg-brand-600 text-white"
                        : isActive
                          ? "bg-brand-100 text-brand-700 ring-2 ring-brand-300"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-brand-700" : isDone ? "text-slate-600" : "text-slate-400"}`}>
                    {STEP_LABELS[s]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ─── STEP 1: Upload ────────────────────────────── */}
          {step === "upload" && (
            <div className="space-y-6">
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-brand-400 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">
                  Drag and drop a file, or click to browse
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports .csv, .xls, .xlsx
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Saved mappings */}
              {savedMappings.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Saved Mappings</h3>
                  <div className="space-y-1.5">
                    {savedMappings.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-slate-700">{m.name}</span>
                          <span className="text-xs text-slate-400 ml-2">
                            {(m.header_fingerprint as string[]).length} columns
                          </span>
                        </div>
                        <button onClick={() => deleteSavedMapping(m.id)} className="p-1 text-slate-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Saved mappings are auto-applied when you upload a file with matching column headers.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 2: Map Fields ────────────────────────── */}
          {step === "map" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{fileName}</span>
                <span className="text-slate-400">· {headers.length} columns · {allRows.length} rows</span>
                {appliedSavedMappingId && (
                  <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-medium">
                    Saved mapping applied
                  </span>
                )}
              </div>

              <CsvFieldMapper<RoastLogField>
                csvHeaders={headers}
                sampleRows={sampleRows}
                mapping={mapping}
                onMappingChange={(m) => setMapping(m as Record<string, RoastLogField>)}
                fieldOptions={ROAST_LOG_FIELDS}
                requiredField="roast_profile"
                requiredFieldLabel="Roast Profile"
              />

              {/* Save mapping checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={saveMapping}
                    onChange={(e) => setSaveMapping(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Save this mapping for next time
                </label>
                {saveMapping && (
                  <input
                    type="text"
                    value={saveMappingName}
                    onChange={(e) => setSaveMappingName(e.target.value)}
                    placeholder="e.g. Cropster export"
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-48"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => { resetAll(); }}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={goFromMapStep}
                  disabled={!requiredMapped}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Match Profiles ────────────────────── */}
          {step === "match" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Match Roast Profiles</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Match each roast profile name from your import to an existing roasted stock record.
                </p>
              </div>

              <div className="space-y-2">
                {uniqueProfiles.map((profileName) => {
                  const match = profileMatches[profileName];
                  const isMatched = match !== null && match !== undefined;
                  const rowCount = parsedLogs.filter((l) => l.roast_profile === profileName).length;

                  return (
                    <div
                      key={profileName}
                      className={`p-3 rounded-lg border ${
                        isMatched ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isMatched ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="text-sm font-medium text-slate-900">{profileName}</span>
                          <span className="text-xs text-slate-400">({rowCount} rows)</span>
                        </div>
                      </div>
                      <select
                        value={match?.roasted_stock_id || "_skip"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "_skip") {
                            setProfileMatches((prev) => ({ ...prev, [profileName]: null }));
                          } else {
                            const stock = roastedStocks.find((s) => s.id === val);
                            setProfileMatches((prev) => ({
                              ...prev,
                              [profileName]: {
                                roasted_stock_id: val,
                                green_bean_id: stock?.green_bean_id || null,
                              },
                            }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="_skip">Skip rows with this profile</option>
                        {roastedStocks.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep("map")}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={goFromMatchStep}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: Preview ───────────────────────────── */}
          {step === "preview" && (
            <div className="space-y-4">
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {importError}
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{importableCount}</p>
                  <p className="text-xs text-slate-500">Ready to import</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{skippedLogCount}</p>
                  <p className="text-xs text-slate-500">Will be skipped</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{matchedCount}/{uniqueProfiles.length}</p>
                  <p className="text-xs text-slate-500">Profiles matched</p>
                </div>
              </div>

              {/* Warnings */}
              {(parseErrors.length > 0 || skippedLogCount > 0) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-800">Warnings</span>
                  </div>
                  <ul className="text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
                    {parseErrors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {unmatchedProfiles.map((p) => (
                      <li key={p}>Rows with profile &quot;{p}&quot; will be skipped (no match)</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview table — first 5 importable rows */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Preview (first 5 rows)</h3>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2 font-medium text-slate-500">Profile</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">Date</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-500">Green (kg)</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-500">Roasted (kg)</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-500">Loss %</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">Batch</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">Matched To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedLogs
                        .filter((l) => profileMatches[l.roast_profile])
                        .slice(0, 5)
                        .map((log, i) => {
                          const match = profileMatches[log.roast_profile];
                          const stockName = roastedStocks.find((s) => s.id === match?.roasted_stock_id)?.name || "—";
                          const loss = log.green_weight_kg > 0
                            ? ((log.green_weight_kg - log.roasted_weight_kg) / log.green_weight_kg * 100).toFixed(1)
                            : "—";

                          return (
                            <tr key={i}>
                              <td className="px-3 py-2 font-medium text-slate-700">{log.roast_profile}</td>
                              <td className="px-3 py-2 text-slate-600">{log.roast_date}</td>
                              <td className="px-3 py-2 text-right text-slate-600">{log.green_weight_kg.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-slate-600">{log.roasted_weight_kg.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-slate-600">{loss}%</td>
                              <td className="px-3 py-2 text-slate-600">{log.batch_number || "—"}</td>
                              <td className="px-3 py-2 text-green-700">{stockName}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(unmatchedProfiles.length > 0 ? "match" : "map")}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={startImport}
                  disabled={importableCount === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Import {importableCount} Roast Logs
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP: Importing ───────────────────────────── */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-700">Importing roast logs...</p>
              <p className="text-xs text-slate-400 mt-1">This may take a moment for large files</p>
            </div>
          )}

          {/* ─── STEP 5: Done ──────────────────────────────── */}
          {step === "done" && importResult && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Import Complete</h3>
              <div className="flex items-center justify-center gap-6 mb-6">
                <div>
                  <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-xs text-slate-500">Imported</p>
                </div>
                {importResult.skipped > 0 && (
                  <div>
                    <p className="text-2xl font-bold text-amber-500">{importResult.skipped}</p>
                    <p className="text-xs text-slate-500">Skipped</p>
                  </div>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-left mb-6 max-w-md mx-auto">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-800">Warnings</span>
                  </div>
                  <ul className="text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                  Done
                </button>
                <button
                  onClick={resetAll}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Import More
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

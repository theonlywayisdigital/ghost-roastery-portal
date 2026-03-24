"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  width: string;
  order: number;
}

interface FormSettings {
  gdpr_consent_required?: boolean;
  gdpr_consent_text?: string;
  success_message?: string;
  redirect_url?: string;
  double_opt_in?: boolean;
  [key: string]: unknown;
}

interface FormBranding {
  background_colour?: string;
  text_colour?: string;
  accent_colour?: string;
  button_colour?: string;
  button_text_colour?: string;
  font_family?: string;
  border_radius?: number;
  logo_url?: string;
  show_powered_by?: boolean;
}

interface FormData {
  id: string;
  name: string;
  description: string | null;
  form_type: string;
  fields: FormField[];
  settings: FormSettings;
  branding: FormBranding;
  roaster_id: string;
  partner_roasters: { business_name: string } | null;
}

interface SubmitResponse {
  success?: boolean;
  message?: string;
  redirect_url?: string | null;
  requires_verification?: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Branding defaults                                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_BRANDING: Required<FormBranding> = {
  background_colour: "#ffffff",
  text_colour: "#1e293b",
  accent_colour: "#2563eb",
  button_colour: "#2563eb",
  button_text_colour: "#ffffff",
  font_family: "system-ui, -apple-system, sans-serif",
  border_radius: 8,
  logo_url: "",
  show_powered_by: true,
};

function resolveBranding(b?: FormBranding): Required<FormBranding> {
  return {
    background_colour: b?.background_colour || DEFAULT_BRANDING.background_colour,
    text_colour: b?.text_colour || DEFAULT_BRANDING.text_colour,
    accent_colour: b?.accent_colour || DEFAULT_BRANDING.accent_colour,
    button_colour: b?.button_colour || DEFAULT_BRANDING.button_colour,
    button_text_colour: b?.button_text_colour || DEFAULT_BRANDING.button_text_colour,
    font_family: b?.font_family || DEFAULT_BRANDING.font_family,
    border_radius: b?.border_radius ?? DEFAULT_BRANDING.border_radius,
    logo_url: b?.logo_url || DEFAULT_BRANDING.logo_url,
    show_powered_by: b?.show_powered_by !== false,
  };
}

/* ------------------------------------------------------------------ */
/*  Inner component (needs useSearchParams inside Suspense)            */
/* ------------------------------------------------------------------ */

function FormPageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const id = params.id;
  const isEmbed = searchParams.get("embed") === "1";
  const isPreview = searchParams.get("preview") === "1";

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  /* ---- Embed resize helper ---- */
  const sendResizeMessage = useCallback(() => {
    if (!isEmbed) return;
    try {
      const height = document.body.scrollHeight;
      window.parent.postMessage(
        { type: "gr-form-resize", formId: id, height },
        "*"
      );
    } catch {
      // ignore cross-origin errors
    }
  }, [isEmbed, id]);

  /* ---- Fetch form data ---- */
  useEffect(() => {
    if (!id) return;

    const url = isPreview
      ? `/api/marketing/forms/${id}`
      : `/api/forms/${id}/render`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((json) => {
        if (!json.form) throw new Error("No form");
        setForm(json.form as FormData);
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, isPreview]);

  /* ---- Send resize on render / mutation ---- */
  useEffect(() => {
    sendResizeMessage();
  });

  useEffect(() => {
    if (!isEmbed) return;
    const observer = new ResizeObserver(() => sendResizeMessage());
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [isEmbed, sendResizeMessage]);

  /* ---- Helpers ---- */
  const branding = resolveBranding(form?.branding);
  const settings = form?.settings || {};
  const fields = (form?.fields || []).slice().sort((a, b) => a.order - b.order);

  const showGdpr =
    settings.gdpr_consent_required || Boolean(settings.gdpr_consent_text);
  const gdprText =
    settings.gdpr_consent_text ||
    "I agree to the processing of my personal data.";

  const setValue = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  /* ---- Validation ---- */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of fields) {
      if (field.type === "hidden") continue;
      if (field.required) {
        const val = values[field.id];
        if (val === undefined || val === null || val === "") {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
      if (field.type === "email" && values[field.id]) {
        const email = String(values[field.id]);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          newErrors[field.id] = "Please enter a valid email address";
        }
      }
    }

    if (showGdpr && settings.gdpr_consent_required && !consent) {
      newErrors["__consent"] = "You must give consent to continue";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ---- Submit ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/forms/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: values,
          consent: consent || false,
          source: isEmbed ? "embedded" : "hosted",
        }),
      });

      const json: SubmitResponse = await res.json();

      if (!res.ok) {
        setSubmitError(json.error || "Something went wrong. Please try again.");
        return;
      }

      if (json.redirect_url) {
        if (isEmbed) {
          window.open(json.redirect_url, "_blank");
        } else {
          window.location.href = json.redirect_url;
        }
        return;
      }

      setSuccessMessage(
        json.message || settings.success_message || "Thanks for your submission!"
      );
      setRequiresVerification(json.requires_verification || false);
      setSubmitted(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Shared styles ---- */
  const borderRadius = branding.border_radius;
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 15,
    fontFamily: branding.font_family,
    color: branding.text_colour,
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const focusRing = `0 0 0 2px ${branding.accent_colour}33`;

  const addFocusHandlers = (
    extra?: React.CSSProperties
  ): {
    onFocus: (e: React.FocusEvent<HTMLElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLElement>) => void;
    style: React.CSSProperties;
  } => ({
    style: { ...inputStyle, ...extra },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      (e.target as HTMLElement).style.borderColor = branding.accent_colour;
      (e.target as HTMLElement).style.boxShadow = focusRing;
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      (e.target as HTMLElement).style.borderColor = "#d1d5db";
      (e.target as HTMLElement).style.boxShadow = "none";
    },
  });

  /* ---- Render field ---- */
  const renderField = (field: FormField) => {
    const error = errors[field.id];

    const labelEl = field.type !== "hidden" && (
      <label
        style={{
          display: "block",
          marginBottom: 6,
          fontSize: 14,
          fontWeight: 500,
          color: branding.text_colour,
          fontFamily: branding.font_family,
        }}
      >
        {field.label}
        {field.required && (
          <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
        )}
      </label>
    );

    const errorEl = error && (
      <p
        style={{
          margin: "4px 0 0",
          fontSize: 13,
          color: "#ef4444",
          fontFamily: branding.font_family,
        }}
      >
        {error}
      </p>
    );

    let input: React.ReactNode = null;

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "number":
      case "date": {
        const htmlType =
          field.type === "phone"
            ? "tel"
            : field.type === "email"
            ? "email"
            : field.type === "number"
            ? "number"
            : field.type === "date"
            ? "date"
            : "text";
        input = (
          <input
            type={htmlType}
            placeholder={field.placeholder || ""}
            value={(values[field.id] as string) || ""}
            onChange={(e) => setValue(field.id, e.target.value)}
            {...addFocusHandlers()}
          />
        );
        break;
      }

      case "textarea":
        input = (
          <textarea
            placeholder={field.placeholder || ""}
            value={(values[field.id] as string) || ""}
            onChange={(e) => setValue(field.id, e.target.value)}
            rows={4}
            {...addFocusHandlers({ resize: "vertical" })}
          />
        );
        break;

      case "select":
        input = (
          <select
            value={(values[field.id] as string) || ""}
            onChange={(e) => setValue(field.id, e.target.value)}
            {...addFocusHandlers({
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              paddingRight: 36,
            })}
          >
            <option value="">{field.placeholder || "Select an option"}</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
        break;

      case "checkbox": {
        const checkedValues = (values[field.id] as string[]) || [];
        input = (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(field.options || []).map((opt) => (
              <label
                key={opt}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  color: branding.text_colour,
                  fontFamily: branding.font_family,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={checkedValues.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setValue(field.id, [...checkedValues, opt]);
                    } else {
                      setValue(
                        field.id,
                        checkedValues.filter((v) => v !== opt)
                      );
                    }
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: branding.accent_colour,
                    cursor: "pointer",
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        );
        break;
      }

      case "radio":
        input = (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(field.options || []).map((opt) => (
              <label
                key={opt}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  color: branding.text_colour,
                  fontFamily: branding.font_family,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name={field.id}
                  checked={values[field.id] === opt}
                  onChange={() => setValue(field.id, opt)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: branding.accent_colour,
                    cursor: "pointer",
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        );
        break;

      case "hidden":
        return (
          <input
            key={field.id}
            type="hidden"
            value={(values[field.id] as string) || field.placeholder || ""}
          />
        );

      default:
        input = (
          <input
            type="text"
            placeholder={field.placeholder || ""}
            value={(values[field.id] as string) || ""}
            onChange={(e) => setValue(field.id, e.target.value)}
            {...addFocusHandlers()}
          />
        );
    }

    return (
      <div
        key={field.id}
        style={{
          gridColumn: field.width === "half" ? "span 1" : "span 2",
          minWidth: 0,
        }}
      >
        {labelEl}
        {input}
        {errorEl}
      </div>
    );
  };

  /* ================================================================ */
  /*  Render states                                                    */
  /* ================================================================ */

  const pageBackground = isEmbed ? "transparent" : branding.background_colour;

  const wrapperStyle: React.CSSProperties = {
    minHeight: isEmbed ? undefined : "100vh",
    backgroundColor: pageBackground,
    display: "flex",
    justifyContent: "center",
    alignItems: isEmbed ? "flex-start" : "center",
    padding: isEmbed ? 0 : "40px 16px",
    boxSizing: "border-box",
    fontFamily: branding.font_family,
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 480,
    backgroundColor: isEmbed ? "transparent" : "#ffffff",
    borderRadius: isEmbed ? 0 : borderRadius + 4,
    boxShadow: isEmbed ? "none" : "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
    padding: isEmbed ? "0 4px" : "32px 28px",
    boxSizing: "border-box",
  };

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div style={{ ...wrapperStyle, alignItems: "center" }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: `3px solid ${branding.accent_colour}33`,
            borderTopColor: branding.accent_colour,
            borderRadius: "50%",
            animation: "gr-spin 0.7s linear infinite",
          }}
        />
        <style>{`@keyframes gr-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ---- Not found ---- */
  if (notFound || !form) {
    return (
      <div style={{ ...wrapperStyle, alignItems: "center" }}>
        <div style={{ textAlign: "center", color: "#64748b", fontFamily: "system-ui, sans-serif" }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: 16 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", color: "#334155" }}>
            Form not found
          </p>
          <p style={{ fontSize: 14, margin: 0 }}>
            This form may have been removed or is no longer active.
          </p>
        </div>
      </div>
    );
  }

  /* ---- Success ---- */
  if (submitted) {
    return (
      <div ref={containerRef} style={wrapperStyle}>
        <div style={{ ...cardStyle, textAlign: "center", padding: isEmbed ? "24px 4px" : "48px 28px" }}>
          {/* Checkmark icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: `${branding.accent_colour}14`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={branding.accent_colour}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {requiresVerification ? (
            <>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: branding.text_colour,
                  margin: "0 0 8px",
                  fontFamily: branding.font_family,
                }}
              >
                Check your email
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: "#64748b",
                  margin: 0,
                  lineHeight: 1.6,
                  fontFamily: branding.font_family,
                }}
              >
                {successMessage ||
                  "We've sent you an email to confirm your subscription. Please check your inbox."}
              </p>
            </>
          ) : (
            <>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: branding.text_colour,
                  margin: "0 0 8px",
                  fontFamily: branding.font_family,
                }}
              >
                Thank you!
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: "#64748b",
                  margin: 0,
                  lineHeight: 1.6,
                  fontFamily: branding.font_family,
                }}
              >
                {successMessage}
              </p>
            </>
          )}

          {branding.show_powered_by && (
            <p
              style={{
                marginTop: 32,
                fontSize: 12,
                color: "#94a3b8",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Powered by{" "}
              <a
                href="https://roasteryplatform.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#94a3b8", textDecoration: "underline" }}
              >
                Roastery Platform
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ---- Form ---- */
  return (
    <div ref={containerRef} style={wrapperStyle}>
      <div style={cardStyle}>
        {/* Logo */}
        {branding.logo_url && (
          <div style={{ marginBottom: 20, textAlign: "center" }}>
            <img
              src={branding.logo_url}
              alt={form.partner_roasters?.business_name || form.name}
              style={{
                maxHeight: 56,
                maxWidth: "70%",
                objectFit: "contain",
              }}
            />
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: branding.text_colour,
            margin: "0 0 4px",
            fontFamily: branding.font_family,
            lineHeight: 1.3,
          }}
        >
          {form.name}
        </h1>

        {/* Description */}
        {form.description && (
          <p
            style={{
              fontSize: 15,
              color: "#64748b",
              margin: "6px 0 0",
              lineHeight: 1.5,
              fontFamily: branding.font_family,
            }}
          >
            {form.description}
          </p>
        )}

        {/* Divider */}
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #e5e7eb",
            margin: "20px 0 24px",
          }}
        />

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            {fields.map(renderField)}
          </div>

          {/* GDPR consent */}
          {showGdpr && (
            <div style={{ marginTop: 20 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  fontSize: 13,
                  color: "#64748b",
                  fontFamily: branding.font_family,
                  cursor: "pointer",
                  lineHeight: 1.5,
                }}
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (errors["__consent"]) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next["__consent"];
                        return next;
                      });
                    }
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    marginTop: 1,
                    accentColor: branding.accent_colour,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                <span>{gdprText}</span>
              </label>
              {errors["__consent"] && (
                <p
                  style={{
                    margin: "4px 0 0 28px",
                    fontSize: 13,
                    color: "#ef4444",
                    fontFamily: branding.font_family,
                  }}
                >
                  {errors["__consent"]}
                </p>
              )}
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 14px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius,
                fontSize: 14,
                color: "#dc2626",
                fontFamily: branding.font_family,
              }}
            >
              {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: branding.font_family,
              color: branding.button_text_colour,
              backgroundColor: branding.button_colour,
              border: "none",
              borderRadius,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              transition: "opacity 0.15s, transform 0.1s",
            }}
            onMouseDown={(e) => {
              if (!submitting) {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
              }
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>

        {/* Powered by */}
        {branding.show_powered_by && (
          <p
            style={{
              textAlign: "center",
              marginTop: 24,
              marginBottom: 0,
              fontSize: 12,
              color: "#94a3b8",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Powered by{" "}
            <a
              href="https://roasteryplatform.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#94a3b8", textDecoration: "underline" }}
            >
              Roastery Platform
            </a>
          </p>
        )}
      </div>

      {/* Responsive: collapse half-width fields on small screens */}
      <style>{`
        @media (max-width: 480px) {
          [style*="grid-column: span 1"] {
            grid-column: span 2 !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page (wraps inner component in Suspense for useSearchParams)       */
/* ------------------------------------------------------------------ */

export default function FormPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid #e5e7eb",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              animation: "gr-spin 0.7s linear infinite",
            }}
          />
          <style>{`@keyframes gr-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <FormPageInner />
    </Suspense>
  );
}

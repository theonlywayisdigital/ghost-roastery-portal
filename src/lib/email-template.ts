/**
 * Shared email template wrapper — applies owner branding (logo, colours, fonts)
 * to all transactional emails. Produces a self-contained HTML email with inline
 * CSS (no external stylesheets except Google Fonts).
 */

import { resolveFontFamily, buildGoogleFontsUrl } from "@/lib/fonts";

export interface EmailBranding {
  logoUrl?: string | null;
  logoSize?: "small" | "medium" | "large";
  primaryColour?: string;
  accentColour?: string;
  buttonColour?: string;
  buttonTextColour?: string;
  buttonStyle?: "sharp" | "rounded" | "pill";
  headingFont?: string;
  bodyFont?: string;
  businessName?: string;
  tagline?: string;
}

const LOGO_SIZE_PX: Record<string, number> = { small: 80, medium: 120, large: 160 };

const PLATFORM_LOGO_URL =
  "https://zaryzynzbpxmscggufdc.supabase.co/storage/v1/object/public/assets/logo-main.png";

const BTN_RADIUS: Record<string, string> = { sharp: "0px", rounded: "6px", pill: "9999px" };

const DEFAULT_BRANDING: Required<Omit<EmailBranding, "tagline" | "businessName">> = {
  logoUrl: PLATFORM_LOGO_URL,
  logoSize: "medium",
  primaryColour: "#0f172a",
  accentColour: "#0083dc",
  buttonColour: "",
  buttonTextColour: "",
  buttonStyle: "rounded",
  headingFont: "inter",
  bodyFont: "inter",
};

/**
 * Wraps email body content in a branded template with:
 * - Coloured header strip with logo or business name
 * - Google Fonts loaded for heading/body
 * - Branded CTA button colour
 * - Footer with optional tagline
 */
export function wrapEmailWithBranding(options: {
  /** The inner HTML content (everything inside the white card) */
  body: string;
  /** Who the email is from (for footer) */
  businessName: string;
  /** Branding settings — pass null/undefined for Roastery Platform defaults */
  branding?: EmailBranding | null;
}): string {
  const { body, businessName, branding } = options;

  const primary = branding?.primaryColour || DEFAULT_BRANDING.primaryColour;
  const headingFamily = resolveFontFamily(branding?.headingFont || DEFAULT_BRANDING.headingFont);
  const bodyFamily = resolveFontFamily(branding?.bodyFont || DEFAULT_BRANDING.bodyFont);
  // Use platform logo only when no branding object is provided (platform emails).
  // When a branding object exists but has no logo, show the text fallback.
  const logoUrl = branding === undefined || branding === null
    ? DEFAULT_BRANDING.logoUrl
    : branding.logoUrl || null;
  const logoMaxHeight = LOGO_SIZE_PX[branding?.logoSize || "medium"] || LOGO_SIZE_PX.medium;
  const tagline = branding?.tagline ?? (branding ? null : "Sell, market & manage — built for roasters");

  const fontsToLoad = Array.from(new Set([headingFamily, bodyFamily]));
  const googleFontsUrl = buildGoogleFontsUrl(fontsToLoad);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${googleFontsUrl ? `<link rel="stylesheet" href="${googleFontsUrl}">` : ""}
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'${bodyFamily}',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <!-- Body card -->
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:40px;">
      <!-- Logo / business name -->
      ${logoUrl
        ? `<div style="text-align:center;padding-bottom:24px;margin-bottom:24px;border-bottom:1px solid #e2e8f0;">
            <div style="display:inline-block;background-color:${primary};border-radius:10px;padding:16px 24px;">
              <img src="${logoUrl}" alt="${businessName}" style="max-height:${logoMaxHeight}px;max-width:280px;object-fit:contain;display:block;" />
            </div>
          </div>`
        : `<div style="text-align:center;padding-bottom:24px;margin-bottom:24px;border-bottom:1px solid #e2e8f0;">
            <p style="margin:0;color:${primary};font-size:18px;font-weight:700;font-family:'${headingFamily}',sans-serif;">${businessName}</p>
          </div>`
      }
      ${body}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;font-family:'${bodyFamily}',sans-serif;">
        ${businessName}${tagline ? ` · ${tagline}` : ""}
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Helper to generate a branded CTA button HTML string.
 */
export function emailButton(options: {
  href: string;
  label: string;
  branding?: EmailBranding | null;
}): string {
  const b = options.branding;
  const btnBg = b?.buttonColour || b?.accentColour || DEFAULT_BRANDING.accentColour;
  const btnText = b?.buttonTextColour || "#ffffff";
  const btnRadius = BTN_RADIUS[b?.buttonStyle || "rounded"] || BTN_RADIUS.rounded;
  const headingFamily = resolveFontFamily(b?.headingFont || DEFAULT_BRANDING.headingFont);

  return `<div style="text-align:center;margin:24px 0;">
  <a href="${options.href}"
     style="display:inline-block;padding:12px 32px;background-color:${btnBg};color:${btnText};text-decoration:none;border-radius:${btnRadius};font-weight:600;font-size:14px;font-family:'${headingFamily}',sans-serif;">
    ${options.label}
  </a>
</div>`;
}

"use client";

import { useState } from "react";
import { Check, Copy, Code, ShoppingBag, FileText } from "@/components/icons";

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </p>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function EmbedCodeGenerator({
  slug,
  storefrontType,
}: {
  slug: string;
  storefrontType: string;
}) {
  const portalUrl = typeof window !== "undefined" ? window.location.origin : "https://portal.ghostroastery.com";
  const showShop = true; // Always show shop embed option
  const showWholesale = storefrontType === "wholesale" || storefrontType === "both";

  const shopScript = `<script\n  src="${portalUrl}/embed.js"\n  data-roaster="${slug}"\n  data-type="shop">\n</script>`;
  const shopIframe = `<iframe\n  src="${portalUrl}/s/${slug}/embed/shop"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border:none;overflow:hidden">\n</iframe>`;

  const wholesaleScript = `<script\n  src="${portalUrl}/embed.js"\n  data-roaster="${slug}"\n  data-type="wholesale-apply">\n</script>`;
  const wholesaleIframe = `<iframe\n  src="${portalUrl}/s/${slug}/embed/wholesale-apply"\n  width="100%"\n  height="800"\n  frameborder="0"\n  style="border:none;overflow:hidden">\n</iframe>`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          Embed Codes
        </h2>
        <p className="text-sm text-slate-500">
          Add your storefront or wholesale application form to any website.
        </p>
      </div>

      {/* Retail Shop Embed */}
      {showShop && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Retail Shop</h3>
              <p className="text-sm text-slate-500">
                Display your products on any website. Clicking &ldquo;Buy Now&rdquo; opens
                your full storefront.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <CodeBlock code={shopScript} label="Script embed (recommended)" />
            <CodeBlock code={shopIframe} label="iFrame fallback" />
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">
              <strong>How it works:</strong> The script tag creates an
              auto-resizing embed of your product grid. Customers click
              &ldquo;Buy Now&rdquo; to be taken to your full storefront where they
              can complete their purchase.
            </p>
          </div>
        </div>
      )}

      {/* Wholesale Apply Embed */}
      {showWholesale && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Wholesale Application
              </h3>
              <p className="text-sm text-slate-500">
                Let trade customers apply for wholesale access directly from your
                website.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <CodeBlock
              code={wholesaleScript}
              label="Script embed (recommended)"
            />
            <CodeBlock code={wholesaleIframe} label="iFrame fallback" />
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">
              <strong>How it works:</strong> The embed renders your branded
              wholesale application form. Applications appear in your Wholesale
              Buyers page for approval.
            </p>
          </div>
        </div>
      )}

      {/* Direct Links */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Code className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Direct Links</h3>
            <p className="text-sm text-slate-500">
              Share these URLs directly — no embed code needed.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Full Storefront
              </p>
              <p className="text-xs text-slate-500">
                {`${portalUrl}/s/${slug}`}
              </p>
            </div>
            <CopyButton text={`${portalUrl}/s/${slug}`} />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Retail Shop (embed)
              </p>
              <p className="text-xs text-slate-500">
                {`${portalUrl}/s/${slug}/embed/shop`}
              </p>
            </div>
            <CopyButton text={`${portalUrl}/s/${slug}/embed/shop`} />
          </div>

          {showWholesale && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Wholesale Application (embed)
                </p>
                <p className="text-xs text-slate-500">
                  {`${portalUrl}/s/${slug}/embed/wholesale-apply`}
                </p>
              </div>
              <CopyButton
                text={`${portalUrl}/s/${slug}/embed/wholesale-apply`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

"use client";

import { useMemo } from "react";
import { X } from "@/components/icons";
import type { WebsiteTheme } from "@/lib/website-sections/types";
import type { TemplateId } from "@/lib/website-templates";
import { modernMinimalTemplate } from "@/lib/website-templates";
import { classicTraditionalTemplate } from "@/lib/website-templates";
import { SectionRenderer } from "@/app/w/[domain]/_components/sections/SectionRenderer";
import { WebsiteThemeProvider } from "../section-editor/WebsiteThemeProvider";

interface TemplatePreviewModalProps {
  templateId: TemplateId;
  templateName: string;
  theme: WebsiteTheme;
  onClose: () => void;
  onApply: () => void;
}

function getTemplateSections(templateId: TemplateId) {
  switch (templateId) {
    case "modern-minimal":
      return modernMinimalTemplate();
    case "classic-traditional":
      return classicTraditionalTemplate();
  }
}

export function TemplatePreviewModal({
  templateId,
  templateName,
  theme,
  onClose,
  onApply,
}: TemplatePreviewModalProps) {
  const sections = useMemo(() => {
    const pages = getTemplateSections(templateId);
    return pages.home ?? [];
  }, [templateId]);

  const navBgColor = theme.navBgColor ?? "#ffffff";
  const navTextColor = theme.navTextColor ?? "#475569";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-slate-900">{templateName}</h2>
          <span className="text-xs text-slate-400">Home Page Preview</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            Apply This Template
          </button>
        </div>
      </div>

      {/* Scrollable preview */}
      <div className="flex-1 overflow-y-auto bg-slate-100">
        <div className="max-w-5xl mx-auto my-6">
          <div
            className="bg-white shadow-xl rounded-lg overflow-hidden"
            style={{
              fontFamily: `'${theme.bodyFont}', sans-serif`,
              color: theme.textColor,
              backgroundColor: theme.backgroundColor,
            }}
          >
            {/* Mini nav bar */}
            <header
              className="backdrop-blur-sm"
              style={{
                backgroundColor: navBgColor,
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
                <span
                  className="text-base font-bold"
                  style={{ fontFamily: `'${theme.headingFont}', sans-serif`, color: navTextColor }}
                >
                  Your Roastery
                </span>
                <div className="flex items-center gap-5">
                  {["Shop", "About", "Contact"].map((label) => (
                    <span
                      key={label}
                      className="text-xs font-medium cursor-default"
                      style={{ color: navTextColor, opacity: 0.7 }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </nav>
            </header>

            {/* Sections */}
            <WebsiteThemeProvider theme={theme}>
              {sections.map((section) => (
                <SectionRenderer
                  key={section.id}
                  section={section}
                  theme={theme}
                  isEditor
                />
              ))}
            </WebsiteThemeProvider>

            {/* Footer */}
            <footer
              className="py-8 px-6 text-center"
              style={{ borderTop: "1px solid #e2e8f0" }}
            >
              <p className="text-xs" style={{ color: theme.textColor, opacity: 0.4 }}>
                {`© ${new Date().getFullYear()} Your Roastery. All rights reserved.`}
              </p>
              <p className="text-[10px] mt-1" style={{ color: theme.textColor, opacity: 0.25 }}>
                Powered by Ghost Roastery
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

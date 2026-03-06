"use client";

import { useState, useEffect } from "react";
import { useMarketingContext } from "@/lib/marketing-context";
import { X, Save } from "@/components/icons";
import { VisualEditor } from "@/app/(portal)/marketing/campaigns/editor/VisualEditor";
import type { EmailBlock, EmailTemplate } from "@/types/marketing";

interface EmailEditorSlideOverProps {
  blocks: EmailBlock[];
  emailBgColor: string;
  onSave: (blocks: EmailBlock[], bgColor: string) => void;
  onClose: () => void;
}

export function EmailEditorSlideOver({
  blocks,
  emailBgColor,
  onSave,
  onClose,
}: EmailEditorSlideOverProps) {
  const { apiBase } = useMarketingContext();
  const [localBlocks, setLocalBlocks] = useState<EmailBlock[]>(blocks);
  const [localBgColor, setLocalBgColor] = useState(emailBgColor);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  useEffect(() => {
    fetch(`${apiBase}/templates`)
      .then((r) => (r.ok ? r.json() : { prebuilt: [], custom: [] }))
      .then((data) => setTemplates([...(data.prebuilt || []), ...(data.custom || [])]))
      .catch(() => {});
  }, [apiBase]);

  function handleSelectTemplate(template: EmailTemplate) {
    setLocalBlocks(template.content);
    if (template.email_bg_color) setLocalBgColor(template.email_bg_color);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-slate-900">Edit Email Content</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(localBlocks, localBgColor)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Content
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="rounded-none border-0">
          <VisualEditor
            blocks={localBlocks}
            onChange={setLocalBlocks}
            emailBgColor={localBgColor}
            onEmailBgColorChange={setLocalBgColor}
            templates={templates}
            onSelectTemplate={handleSelectTemplate}
          />
        </div>
      </div>
    </div>
  );
}

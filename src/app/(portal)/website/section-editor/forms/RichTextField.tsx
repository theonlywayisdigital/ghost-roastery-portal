"use client";

import { useRef, useCallback } from "react";
import { FormField } from "./FormField";

interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

export function RichTextField({ label, value, onChange, description }: RichTextFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  function execCommand(command: string, val?: string) {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    handleInput();
  }

  return (
    <FormField label={label} description={description}>
      <div className="rounded-md border border-neutral-200 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-neutral-50 border-b border-neutral-200">
          <ToolbarButton onClick={() => execCommand("bold")} title="Bold">
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand("italic")} title="Italic">
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand("underline")} title="Underline">
            <span className="underline">U</span>
          </ToolbarButton>
          <div className="w-px h-4 bg-neutral-200 mx-1" />
          <ToolbarButton onClick={() => execCommand("insertUnorderedList")} title="Bullet list">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand("insertOrderedList")} title="Numbered list">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.242 5.992h12m-12 6.003h12m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 11-1.087 1.91l1.89-2.218" />
            </svg>
          </ToolbarButton>
        </div>
        <div
          ref={editorRef}
          contentEditable
          className="px-3 py-2 min-h-[100px] text-sm text-neutral-900 outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      </div>
    </FormField>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors text-xs"
    >
      {children}
    </button>
  );
}

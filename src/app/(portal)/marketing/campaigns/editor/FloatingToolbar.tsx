"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  Bold,
  Italic,
  Underline,
  Link,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

interface FloatingToolbarProps {
  anchorRef: RefObject<HTMLDivElement | null>;
}

export function FloatingToolbar({ anchorRef }: FloatingToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      top: -40,
      left: rect.width / 2 - 140,
    });
  }, [anchorRef]);

  if (!position) return null;

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value);
  }

  function handleLink() {
    const url = prompt("Enter URL:");
    if (url) exec("createLink", url);
  }

  return (
    <div
      className="absolute z-30 flex items-center gap-0.5 bg-slate-800 rounded-lg px-1.5 py-1 shadow-xl"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <ToolBtn icon={Bold} onClick={() => exec("bold")} title="Bold" />
      <ToolBtn icon={Italic} onClick={() => exec("italic")} title="Italic" />
      <ToolBtn icon={Underline} onClick={() => exec("underline")} title="Underline" />
      <Sep />
      <ToolBtn icon={Link} onClick={handleLink} title="Link" />
      <Sep />
      <ToolBtn icon={List} onClick={() => exec("insertUnorderedList")} title="Bullet list" />
      <ToolBtn icon={ListOrdered} onClick={() => exec("insertOrderedList")} title="Numbered list" />
      <Sep />
      <ToolBtn icon={AlignLeft} onClick={() => exec("justifyLeft")} title="Align left" />
      <ToolBtn icon={AlignCenter} onClick={() => exec("justifyCenter")} title="Center" />
      <ToolBtn icon={AlignRight} onClick={() => exec("justifyRight")} title="Align right" />
    </div>
  );
}

function ToolBtn({
  icon: Icon,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
      title={title}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-slate-600 mx-0.5" />;
}

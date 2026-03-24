"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface ActionMenuProps {
  /** The trigger button ref — menu is positioned relative to this element */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Whether the menu is open */
  open: boolean;
  /** Called to close the menu */
  onClose: () => void;
  /** Menu width class (default: "w-44") */
  width?: string;
  /** Preferred horizontal alignment (default: "right") */
  align?: "left" | "right";
  /** Menu contents (buttons, links, etc.) */
  children: ReactNode;
}

/**
 * Portal-rendered action menu that:
 * - Renders on top of all content (z-[9990], document.body portal)
 * - Flips upward when insufficient space below
 * - Aligns left or right to the anchor
 * - Closes on outside click or Escape
 */
export function ActionMenu({
  anchorRef,
  open,
  onClose,
  width = "w-44",
  align = "right",
  children,
}: ActionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    flipUp: boolean;
  } | null>(null);

  const calcPosition = useCallback(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;

    const rect = anchor.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const gap = 4; // px gap between anchor and menu

    // Vertical: prefer below, flip above if not enough space
    const spaceBelow = viewportH - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const flipUp = spaceBelow < menuRect.height && spaceAbove > spaceBelow;

    let top: number;
    if (flipUp) {
      top = rect.top + window.scrollY - menuRect.height - gap;
    } else {
      top = rect.bottom + window.scrollY + gap;
    }

    // Horizontal: align to anchor edge, clamp to viewport
    let left: number;
    if (align === "right") {
      left = rect.right + window.scrollX - menuRect.width;
    } else {
      left = rect.left + window.scrollX;
    }

    // Clamp horizontal to viewport
    if (left + menuRect.width > viewportW - 8) {
      left = viewportW - menuRect.width - 8;
    }
    if (left < 8) left = 8;

    setPos({ top, left, flipUp });
  }, [anchorRef, align]);

  // Calculate position when opening or on scroll/resize
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    // Initial calc after portal renders
    requestAnimationFrame(() => calcPosition());

    const handleUpdate = () => calcPosition();
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);
    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [open, calcPosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={
        pos
          ? { position: "absolute", top: pos.top, left: pos.left }
          : { position: "fixed", top: -9999, left: -9999, visibility: "hidden" as const }
      }
      className={`${width} bg-white border border-slate-200 rounded-lg shadow-lg z-[9990] py-1`}
    >
      {children}
    </div>,
    document.body
  );
}

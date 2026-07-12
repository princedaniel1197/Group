"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string; // id of the heading element
  children: ReactNode;
  size?: "sm" | "lg";
}

/**
 * Minimal accessible modal: portal to <body>, backdrop + Esc to close, focus
 * moves in on open and restores on close, background scroll locked. Motion is
 * governed by globals.css (respects prefers-reduced-motion).
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  size = "sm",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the first focusable element in the panel.
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'input, textarea, button, [href], select, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative w-full ${
          size === "lg" ? "max-w-3xl" : "max-w-sm"
        } rounded-lg border border-line bg-ink-raised p-6 shadow-2xl`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

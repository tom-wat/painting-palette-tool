'use client';

import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  /** Shown right of the title, e.g. a count or the active mode. */
  hint?: string;
  children: React.ReactNode;
}

/** Titled, collapsible group inside a side panel. */
export default function CollapsibleSection({
  title,
  defaultOpen = true,
  hint,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border px-4 py-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {title}
        <span className="flex items-center gap-2">
          {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
          <svg
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && <div className="space-y-4 pt-3">{children}</div>}
    </div>
  );
}

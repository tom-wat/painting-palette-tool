'use client';

import React, { useState } from 'react';
import Sheet from '../ui/Sheet';

interface AppShellProps {
  title: string;
  /** Makes the title a button — used to start over. */
  onTitleClick?: () => void;
  /** Buttons shown at the right end of the header (export, mode toggles…). */
  headerActions?: React.ReactNode;
  /** Settings panel: left sidebar on desktop, bottom sheet on mobile. */
  leftPanel?: React.ReactNode;
  leftPanelLabel?: string;
  /** Display/results panel: right sidebar on desktop, bottom sheet on mobile. */
  rightPanel?: React.ReactNode;
  rightPanelLabel?: string;
  /** Dot on the mobile trigger for the right panel — new results are waiting. */
  rightPanelBadge?: boolean;
  /** Fired when the right panel sheet is opened — clear the badge here. */
  onRightPanelOpen?: () => void;
  /** Canvas area. */
  children: React.ReactNode;
}

function MobilePanelButton({
  label,
  badge,
  onClick,
}: {
  label: string;
  badge?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="relative inline-flex">
        {label}
        {badge && (
          <span className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-foreground" />
        )}
      </span>
    </button>
  );
}

/**
 * Standard tool layout, shared with the sibling drawing tools. Desktop:
 * header, left settings sidebar, canvas, right display sidebar. Mobile:
 * header, canvas, bottom toolbar opening each panel as a bottom sheet.
 */
export default function AppShell({
  title,
  onTitleClick,
  headerActions,
  leftPanel,
  leftPanelLabel = 'Controls',
  rightPanel,
  rightPanelLabel = 'Display',
  rightPanelBadge,
  onRightPanelOpen,
  children,
}: AppShellProps) {
  const [openPanel, setOpenPanel] = useState<'left' | 'right' | null>(null);

  const openRightPanel = () => {
    onRightPanelOpen?.();
    setOpenPanel('right');
  };

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <h1 className="truncate text-sm font-semibold">
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              title="Clear the image and start over"
              className="rounded-sm transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {title}
            </button>
          ) : (
            title
          )}
        </h1>
        <div className="flex items-center gap-2">{headerActions}</div>
      </header>

      <div className="flex min-h-0 flex-1">
        {leftPanel && (
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-border lg:block">
            {leftPanel}
          </aside>
        )}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
        {rightPanel && (
          <aside className="hidden w-80 shrink-0 overflow-hidden border-l border-border lg:block">
            {rightPanel}
          </aside>
        )}
      </div>

      {(leftPanel || rightPanel) && (
        <nav className="flex shrink-0 border-t border-border pb-[env(safe-area-inset-bottom)] lg:hidden">
          {leftPanel && (
            <MobilePanelButton label={leftPanelLabel} onClick={() => setOpenPanel('left')} />
          )}
          {rightPanel && (
            <MobilePanelButton
              label={rightPanelLabel}
              badge={rightPanelBadge}
              onClick={openRightPanel}
            />
          )}
        </nav>
      )}

      <Sheet
        isOpen={openPanel === 'left'}
        onClose={() => setOpenPanel(null)}
        title={leftPanelLabel}
      >
        {leftPanel}
      </Sheet>
      <Sheet
        isOpen={openPanel === 'right'}
        onClose={() => setOpenPanel(null)}
        title={rightPanelLabel}
      >
        {rightPanel}
      </Sheet>
    </div>
  );
}

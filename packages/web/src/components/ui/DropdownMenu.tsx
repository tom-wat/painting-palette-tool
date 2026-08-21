'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

/**
 * Menu panel anchored to a trigger button, with a single-choice group inside.
 *
 * Modelled on the dropdown in the sibling tools, which get it from Radix. This
 * project has no Radix, so the parts that matter are done by hand: focus moves
 * into the panel on open and back to the trigger on close, arrow keys walk the
 * items, and Escape or a click outside dismisses it.
 */

interface MenuContextValue {
  close: (_restoreFocus?: boolean) => void;
}
const MenuContext = createContext<MenuContextValue | null>(null);

interface RadioGroupContextValue {
  value: string;
  onValueChange: (_value: string) => void;
}
const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

const ITEM_SELECTOR = '[role="menuitemradio"]';

function getItems(root: HTMLElement | null): HTMLElement[] {
  return root ? Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) : [];
}

interface DropdownMenuProps {
  /** The button that opens the menu. Cloned to receive the menu wiring. */
  trigger: React.ReactElement;
  /** Which edge of the trigger the panel lines up with. */
  align?: 'start' | 'end';
  /** Names the panel for assistive tech. */
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}

export default function DropdownMenu({
  trigger,
  align = 'start',
  ariaLabel,
  children,
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    // Sending focus back to the trigger is what keeps keyboard use from
    // dumping the user at the top of the document.
    if (restoreFocus) containerRef.current?.querySelector('button')?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const items = getItems(contentRef.current);
    const checked = items.find((item) => item.getAttribute('aria-checked') === 'true');
    (checked ?? items[0])?.focus();
  }, [open]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    // Tab moves on rather than cycling inside the panel, so let it through and
    // just dismiss — without stealing focus back to the trigger.
    if (event.key === 'Tab') {
      close(false);
      return;
    }

    const items = getItems(contentRef.current);
    if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);

    const focusAt = (next: number) => {
      event.preventDefault();
      items[(next + items.length) % items.length].focus();
    };

    if (event.key === 'ArrowDown') focusAt(index + 1);
    else if (event.key === 'ArrowUp') focusAt(index - 1);
    else if (event.key === 'Home') focusAt(0);
    else if (event.key === 'End') focusAt(items.length - 1);
  };

  const triggerNode = React.cloneElement(
    trigger as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>,
    {
      onClick: () => setOpen((previous) => !previous),
      'aria-haspopup': 'menu',
      'aria-expanded': open,
    }
  );

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {triggerNode}
      {open && (
        <div
          ref={contentRef}
          role="menu"
          aria-label={ariaLabel}
          className={cn(
            'absolute z-50 mt-1 min-w-32 overflow-hidden bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10',
            align === 'end' ? 'right-0' : 'left-0',
            className
          )}
        >
          <MenuContext.Provider value={{ close }}>{children}</MenuContext.Provider>
        </div>
      )}
    </div>
  );
}

interface DropdownMenuRadioGroupProps {
  value: string;
  onValueChange: (_value: string) => void;
  children: React.ReactNode;
}

export function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
}: DropdownMenuRadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      {children}
    </RadioGroupContext.Provider>
  );
}

interface DropdownMenuRadioItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuRadioItem({
  value,
  children,
  className,
}: DropdownMenuRadioItemProps) {
  const group = useContext(RadioGroupContext);
  const menu = useContext(MenuContext);
  if (!group) {
    throw new Error('DropdownMenuRadioItem must be used inside <DropdownMenuRadioGroup>');
  }

  const checked = group.value === value;

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      // Not in the tab order: arrow keys move between items, Tab leaves.
      tabIndex={-1}
      onClick={() => {
        group.onValueChange(value);
        menu?.close();
      }}
      className={cn(
        'relative flex w-full cursor-default select-none items-center gap-2 py-2 pl-2 pr-8 text-left text-xs outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        '[&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
        className
      )}
    >
      {children}
      {checked && (
        <span className="pointer-events-none absolute right-2 flex items-center justify-center">
          <Check aria-hidden />
        </span>
      )}
    </button>
  );
}

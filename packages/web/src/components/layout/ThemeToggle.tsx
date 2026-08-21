'use client';

import React from 'react';
import { Desktop, Moon, Sun } from '@phosphor-icons/react';
import Button from '../ui/Button';
import {
  DropdownMenu,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '../ui';
import { useTheme } from '../ThemeProvider';
import { type ThemePreference } from '@/lib/theme';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Desktop },
] as const;

/** Header control for switching between the light, dark and system palettes. */
export default function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <DropdownMenu
      align="end"
      ariaLabel="Theme"
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label="Theme" title="Theme">
          {/*
            Which icon shows is left to CSS rather than to `resolvedTheme`.
            This button is server-rendered, and the blocking script in
            layout.tsx has already put `.dark` on <html> before the first
            paint — so the right icon is on screen immediately, with no
            hydration mismatch and no pop-in on every load.
          */}
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      }
    >
      {/*
        Only mounted once the menu is open, so reading the stored preference
        here cannot disagree with the server.
      */}
      <DropdownMenuRadioGroup
        value={preference}
        onValueChange={(value) => setPreference(value as ThemePreference)}
      >
        {THEMES.map(({ value, label, icon: Icon }) => (
          <DropdownMenuRadioItem key={value} value={value}>
            <Icon aria-hidden />
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenu>
  );
}

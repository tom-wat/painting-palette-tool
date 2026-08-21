'use client';

import React from 'react';
import SegmentedControl from './SegmentedControl';
import { useTheme } from '../ThemeProvider';
import { THEME_PREFERENCES, type ThemePreference } from '@/lib/theme';

const LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'Auto',
};

const DESCRIPTIONS: Record<ThemePreference, string> = {
  light: 'Always use the light palette',
  dark: 'Always use the dark palette',
  system: 'Follow the operating system setting',
};

const options = THEME_PREFERENCES.map((value) => ({
  value,
  label: LABELS[value],
  description: DESCRIPTIONS[value],
}));

/**
 * Light / Dark / Auto switch for the UI palette.
 *
 * Reads straight from the provider with no mounted-yet guard: the state is
 * already settled by the time this renders, since ThemeProvider mounts with the
 * app while this sits inside a collapsed section the user has to open.
 */
export default function ThemeControl() {
  const { preference, setPreference } = useTheme();

  return (
    <SegmentedControl
      ariaLabel="Theme"
      value={preference}
      onChange={setPreference}
      options={options}
      size="sm"
    />
  );
}

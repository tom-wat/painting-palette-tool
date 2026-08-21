import React from 'react';
import { THEME_STORAGE_KEY } from '@/lib/theme';

/**
 * Applies the stored theme before the first paint.
 *
 * This has to be an inline, render-blocking script: React only reaches
 * `useTheme` after hydration, and by then a dark-mode user has already been
 * shown a white page. It is deliberately a self-contained copy of the small
 * amount of logic in `lib/theme.ts` — an import would become a module the
 * browser has to fetch, which is exactly the delay being avoided.
 */
export default function ThemeScript() {
  const script = `(function(){try{
var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(p!=='light'&&p!=='dark')p='system';
var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;
r.classList.toggle('dark',d);
r.style.colorScheme=d?'dark':'light';
}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

/**
 * Join conditional class names. Deliberately not tailwind-merge: the UI here
 * builds class lists from mutually exclusive branches rather than by
 * overriding earlier utilities, so a plain join is enough and keeps the web
 * package dependency-free.
 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

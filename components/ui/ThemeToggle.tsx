"use client";

import { useTheme } from "@/lib/theme";

/** Sun/moon toggle. Renders both glyphs; CSS decides which shows (no flash). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle light or dark mode"
      title="Toggle theme"
      className={`h-8 w-8 shrink-0 grid place-items-center rounded-full border border-line bg-surface
                  text-muted hover:text-foreground hover:border-oxblood transition-colors ${className}`}
    >
      <span className="dark:hidden" aria-hidden>☾</span>
      <span className="hidden dark:inline" aria-hidden>☀</span>
    </button>
  );
}

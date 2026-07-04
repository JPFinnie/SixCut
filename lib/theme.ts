"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/**
 * Theme state synced to the .dark class on <html> (set pre-paint by the
 * layout init script). Any component may toggle; all observers stay in sync.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setThemeState(el.classList.contains("dark") ? "dark" : "light");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const setTheme = (t: Theme) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    try {
      localStorage.setItem("six-cut-theme", t);
    } catch {
      /* private mode */
    }
  };

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}

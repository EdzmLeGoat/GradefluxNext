import { useState, useEffect } from "react";
import Image from "next/image";

// Extend Window interface to include themeManager
declare global {
  interface Window {
    themeManager?: {
      getCurrentTheme: () => string;
      toggle: () => string;
    };
  }
}

interface ThemeChangeEvent extends CustomEvent {
  detail: {
    theme: string;
    previousTheme: string;
  };
}

/**
 * Theme Toggle Component
 * A simple button to toggle between light and dark themes
 */
const ThemeToggle = () => {
  const [theme, setTheme] = useState<string>("light");

  useEffect(() => {
    let mounted = true;
    let remover: (() => void) | null = null;

    async function ensureThemeManager() {
      if (typeof window === "undefined") return;

      // If a global manager already exists, use it. Otherwise dynamically import
      // the client-only theme module so it doesn't run during SSR.
      let mgr = window.themeManager as any;
      if (!mgr) {
        try {
          const mod = await import("../../../../src/theme.js");
          mgr = mod?.default;
          if (mgr) window.themeManager = mgr;
        } catch (e) {
          console.warn("Failed to load theme manager:", e);
          return;
        }
      }

      if (!mounted) return;

      try {
        const current = mgr.getCurrentTheme();
        setTheme(current);
      } catch (e) {
        // fallback to detecting via document if manager is misbehaving
        try {
          const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
          ).matches;
          setTheme(prefersDark ? "dark" : "light");
        } catch (err) {
          setTheme("light");
        }
      }

      const handleThemeChange = (event: ThemeChangeEvent) => {
        if (!mounted) return;
        setTheme(event.detail.theme);
      };

      window.addEventListener(
        "themechange",
        handleThemeChange as EventListener,
      );
      remover = () =>
        window.removeEventListener(
          "themechange",
          handleThemeChange as EventListener,
        );
    }

    ensureThemeManager();

    return () => {
      mounted = false;
      if (remover) remover();
    };
  }, []);

  const handleToggle = async () => {
    if (typeof window === "undefined") return;

    let mgr = window.themeManager as any;
    if (!mgr) {
      try {
        const mod = await import("../../../../src/theme.js");
        mgr = mod?.default;
        if (mgr) window.themeManager = mgr;
      } catch (e) {
        console.warn("Failed to load theme manager on toggle:", e);
        return;
      }
    }

    try {
      const newTheme = mgr.toggle();
      setTheme(newTheme);
    } catch (e) {
      console.warn("Theme toggle failed:", e);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="theme-toggle"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? (
        <Image
          src="/assets/header/light.svg"
          alt="Switch to light mode"
          width={24}
          height={24}
        />
      ) : (
        <Image
          src="/assets/header/dark.svg"
          alt="Switch to dark mode"
          width={24}
          height={24}
          style={{ filter: "invert(1) brightness(0)" }}
        />
      )}
    </button>
  );
};

export default ThemeToggle;

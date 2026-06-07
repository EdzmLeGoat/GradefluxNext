/**
 * Theme management utilities for Gradeflux
 */

class ThemeManager {
  constructor() {
    this.STORAGE_KEY = "gradeflux-theme";
    this.THEME_CLASS = "dark";
    this.LIGHT_CLASS = "light";

    this.init();
  }

  /**
   * Initialize theme system
   */
  init() {
    // Load saved theme or detect system preference
    const savedTheme = this.getSavedTheme();
    const systemPrefersDark = this.getSystemPreference();

    if (savedTheme) {
      this.setTheme(savedTheme);
    } else if (systemPrefersDark) {
      this.setTheme("dark");
    } else {
      this.setTheme("light");
    }

    // Listen for system preference changes
    this.watchSystemPreference();
  }

  /**
   * Get saved theme from localStorage
   */
  getSavedTheme() {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Check if system prefers dark mode
   */
  getSystemPreference() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /**
   * Get current theme
   */
  getCurrentTheme() {
    const root = document.documentElement;
    if (root.classList.contains(this.THEME_CLASS)) {
      return "dark";
    } else if (root.classList.contains(this.LIGHT_CLASS)) {
      return "light";
    }
    return this.getSystemPreference() ? "dark" : "light";
  }

  /**
   * Set theme
   */
  setTheme(theme) {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove(this.THEME_CLASS, this.LIGHT_CLASS);

    if (theme === "dark") {
      root.classList.add(this.THEME_CLASS);
    } else if (theme === "light") {
      root.classList.add(this.LIGHT_CLASS);
    }
    // If theme is 'system', don't add any class (let CSS media query handle it)

    // Save to localStorage
    localStorage.setItem(this.STORAGE_KEY, theme);

    // Dispatch custom event
    window.dispatchEvent(
      new CustomEvent("themechange", {
        detail: { theme, previousTheme: this.getCurrentTheme() },
      })
    );
  }

  /**
   * Toggle between light and dark themes
   */
  toggle() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
    return newTheme;
  }

  /**
   * Watch for system preference changes
   */
  watchSystemPreference() {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    mediaQuery.addEventListener("change", (e) => {
      // Only apply system preference if no explicit theme is saved
      const savedTheme = this.getSavedTheme();
      if (!savedTheme || savedTheme === "system") {
        this.setTheme("system");
      }
    });
  }

  /**
   * Reset to system preference
   */
  useSystemPreference() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.setTheme("system");
  }

  /**
   * Get available themes
   */
  getAvailableThemes() {
    return ["light", "dark", "system"];
  }
}

// Create global instance
const themeManager = new ThemeManager();

// Export for use in modules
export default themeManager;

// Also make available globally
window.themeManager = themeManager;

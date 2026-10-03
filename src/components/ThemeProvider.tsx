"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

let currentTheme: Theme = "light";
let themeInitialized = false;
const themeSubscribers = new Set<() => void>();

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  localStorage.setItem("theme", theme);
}

function initializeTheme() {
  if (themeInitialized) return;

  // Check localStorage or system preference
  const savedTheme = localStorage.getItem("theme") as Theme | null;
  let initialTheme: Theme;

  if (savedTheme) {
    initialTheme = savedTheme;
  } else {
    // Check system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    initialTheme = prefersDark ? "dark" : "light";
  }

  currentTheme = initialTheme;
  themeInitialized = true;
  applyTheme(initialTheme);
}

function subscribeToTheme(subscriber: () => void) {
  themeSubscribers.add(subscriber);
  initializeTheme();
  subscriber();

  return () => {
    themeSubscribers.delete(subscriber);
  };
}

function getThemeSnapshot() {
  return currentTheme;
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function updateTheme(theme: Theme) {
  currentTheme = theme;
  applyTheme(theme);
  themeSubscribers.forEach((subscriber) => subscriber());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  const toggleTheme = () => {
    updateTheme(currentTheme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

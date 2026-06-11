import React, { createContext, useContext, useEffect, useState } from "react";

// Create the context
const ThemeContext = createContext();

// Create the hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Create the provider component
export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const applyTheme = () => {
      let resolvedTheme = "light";
      if (themeMode === "dark") {
        resolvedTheme = "dark";
      } else if (themeMode === "device") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        resolvedTheme = prefersDark ? "dark" : "light";
      }

      setTheme(resolvedTheme);

      if (resolvedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    applyTheme();

    if (themeMode === "device") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyTheme();
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [themeMode]);

  const changeThemeMode = (mode) => {
    if (mode === "light" || mode === "dark" || mode === "device") {
      setThemeMode(mode);
      localStorage.setItem("theme", mode);
    }
  };

  const toggleTheme = () => {
    const nextMode = theme === "dark" ? "light" : "dark";
    changeThemeMode(nextMode);
  };

  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={{ isDark, theme, themeMode, changeThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Export the context itself (optional)
export default ThemeContext;

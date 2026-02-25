import { useEffect, useState } from "react";

export default function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("beast-theme") || "light"
  );

  useEffect(() => {
    localStorage.setItem("beast-theme", theme);
  }, [theme]);

  return {
    theme,
    setTheme,
    isDark: theme === "dark",
  };
}
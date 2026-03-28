import { useEffect, useState } from "react";

export default function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("asha-theme") || "light"
  );

  useEffect(() => {
    localStorage.setItem("asha-theme", theme);
  }, [theme]);

  return {
    theme,
    setTheme,
    isDark: theme === "dark",
  };
}
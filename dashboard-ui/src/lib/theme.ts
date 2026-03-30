export type Theme = "light" | "dark";

export function getStoredTheme(): Theme {
  return (localStorage.getItem("ads-agent-theme") as Theme) ?? "light";
}

export function applyTheme(theme: Theme) {
  localStorage.setItem("ads-agent-theme", theme);
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

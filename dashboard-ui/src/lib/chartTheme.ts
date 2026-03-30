// Helper para pegar as cores atuais do tema (light/dark)
export function getChartColors() {
  const isDark = document.documentElement.classList.contains("dark");
  return {
    grid:    isDark ? "#334155" : "#E2E8F0",
    text:    isDark ? "#94A3B8" : "#94A3B8",
    bg:      isDark ? "#1E293B" : "#FFFFFF",
    border:  isDark ? "#334155" : "#E2E8F0",
    tooltip: isDark ? "#1E293B" : "#FFFFFF",
  };
}

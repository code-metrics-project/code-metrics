/**
 * Chart color utilities for theme-aware visualization colors.
 * These colors are designed to be visible against both light and dark backgrounds.
 */

// CSS variable-based colors for use in chartConfig (shadcn chart system)
// The ChartContainer component generates --color-{key} CSS vars from these
export const CHART_CONFIG_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Semantic colors for specific data types - visible in both themes
export const SEMANTIC_COLORS = {
  // Success/failure - high contrast versions
  success: "#22c55e", // green-500 - visible on both backgrounds
  failure: "#ef4444", // red-500 - visible on both backgrounds
  warning: "#f59e0b", // amber-500 - visible on both backgrounds

  // Severity colors
  critical: "#dc2626", // red-600
  high: "#f97316", // orange-500
  medium: "#eab308", // yellow-500
  low: "#22c55e", // green-500
  info: "#3b82f6", // blue-500
};

// Severity palette for vulnerability/issue displays
export const SEVERITY_PALETTE = [
  "#dc2626", // critical - red-600
  "#f97316", // high - orange-500
  "#eab308", // medium - yellow-500
  "#22c55e", // low - green-500
  "#3b82f6", // info - blue-500
  "#8b5cf6", // other - violet-500
];

// Golden/accent color for DORA metrics and highlights
export const ACCENT_COLORS = {
  gold: "#fbbf24", // amber-400 - good visibility on both themes
  blue: "#3b82f6", // blue-500
  cyan: "#06b6d4", // cyan-500
  purple: "#8b5cf6", // violet-500
};

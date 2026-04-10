/**
 * Chart colour palette aligned with the app's design system.
 * Primary blue tones with complementary accent colors.
 */
const chartColours = [
  "#0369a1", // primary - sky-700
  "#0ea5e9", // sky-500
  "#06b6d4", // cyan-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#f43f5e", // rose-500
  "#84cc16", // lime-500
  "#a855f7", // purple-500
  "#22d3ee", // cyan-400
  "#fb923c", // orange-400
  "#4ade80", // green-400
];

/**
 * Semantic category colours for status-based visualizations.
 * Designed to work well in both light and dark modes.
 */
const categoryColours = {
  success: ["#10b981", "#34d399", "#6ee7b7"], // emerald shades
  danger: ["#ef4444", "#f87171", "#fca5a5"], // red shades
  warning: ["#f59e0b", "#fbbf24", "#fcd34d"], // amber shades
  neutral: ["#6b7280", "#9ca3af", "#d1d5db"], // gray shades
  unknown: ["#94a3b8"], // slate-400
};

export const chooseColour = (index: number, colourVariant?: string): string => {
  if (colourVariant && Object.keys(categoryColours).includes(colourVariant)) {
    const category = categoryColours[colourVariant as keyof typeof categoryColours];
    return category[index % category.length];
  } else {
    return chartColours[index % chartColours.length];
  }
};

export const shadeColor = (color: string, decimal: number): string => {
  const base = color.startsWith("#") ? 1 : 0;

  let r = parseInt(color.substring(base, 3), 16);
  let g = parseInt(color.substring(base + 2, 5), 16);
  let b = parseInt(color.substring(base + 4, 7), 16);

  r = Math.round(r / decimal);
  g = Math.round(g / decimal);
  b = Math.round(b / decimal);

  r = r < 255 ? r : 255;
  g = g < 255 ? g : 255;
  b = b < 255 ? b : 255;

  const rr = r.toString(16).length === 1 ? `0${r.toString(16)}` : r.toString(16);
  const gg = g.toString(16).length === 1 ? `0${g.toString(16)}` : g.toString(16);
  const bb = b.toString(16).length === 1 ? `0${b.toString(16)}` : b.toString(16);

  return `#${rr}${gg}${bb}`;
};

export function getColourForKey(key: string, index: number) {
  // for example: "runs-aborted/athena" or "ncloc/athena-backend"
  let keyType = key;
  if (keyType.includes("/")) {
    keyType = key.split("/")[0];
    if (keyType.includes("-")) {
      keyType = keyType.split("-")[1];
    }
  }

  switch (keyType) {
    case "successful":
      return pickColour(categoryColours.success, index);
    case "failed":
      return pickColour(categoryColours.danger, index);
    case "aborted":
      return pickColour(categoryColours.warning, index);
    case "critical":
    case "high":
      return pickColour(categoryColours.danger, index);
    case "medium":
      return pickColour(categoryColours.warning, index);
    case "low":
      return pickColour(categoryColours.neutral, index);
    case "unknown":
      return pickColour(categoryColours.unknown, index);
    default:
      return chartColours[index % chartColours.length];
  }
}

function pickColour(category: string[], index: number): string {
  return category[index % category.length];
}

export type VariantType = "success" | "warning" | "danger" | "no_data";

export function convertVariantToColour(variant: VariantType) {
  switch (variant) {
    case "no_data":
      return "#94a3b8"; // slate-400
    case "success":
      return "#10b981"; // emerald-500
    case "warning":
      return "#f59e0b"; // amber-500
    case "danger":
    default:
      return "#ef4444"; // red-500
  }
}

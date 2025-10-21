const chartColours = [
  "#007bff",
  "#07e484",
  "#ffc609",
  "#09d2ff",
  "#09ff0d",
  "#ffd609",
  "#09ffea",
  "#b909ff",
  "#ff0984",
  "#743f08",
  "#1c047b",
  "#ff7009",
  "#ff0990",
  "#ffeb09",
  "#ffad09",
];

const categoryColours = {
  success: ["#09ff90", "#09ff0d", "#04df63"],
  danger: ["rgba(255,9,9,0.59)", "rgba(255,75,9,0.68)", "rgba(255,9,54,0.44)"],
  warning: ["rgba(255,214,9,0.58)", "rgba(255,235,9,0.69)", "rgba(255,173,9,0.7)"],
  neutral: ["#b8ebf0", "#a7dfe6", "#8dc3ca"],
  unknown: ["#e0e3e3"],
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
      return "#CCCCCC";
    case "success":
      return "#4CAF50";
    case "warning":
      return "#FF9800";
    case "danger":
    default:
      return "#F44336";
  }
}

const currentLocale = Intl.DateTimeFormat().resolvedOptions().locale;

export function getMetricSuffix(m: string): string {
  switch (m) {
    case "code-coverage":
      return "%";
    default:
      return "";
  }
}

export function getMetricTitle(m: string): string {
  switch (m) {
    case "ncloc":
      return "Lines of code";
    default:
      m = m.replaceAll("_", " ");
      return m.substring(0, 1).toUpperCase() + (m.length > 1 ? m.substring(1) : "");
  }
}

export enum MetricValueCategory {
  Good,
  Warning,
  Danger,
}

/**
 * @param coverage value in range 1-100
 */
export function categoriseCoverage(coverage: number): MetricValueCategory {
  if (coverage >= 80) {
    return MetricValueCategory.Good;
  } else if (coverage >= 50) {
    return MetricValueCategory.Warning;
  } else {
    return MetricValueCategory.Danger;
  }
}

export function formatInteger(input: number): string {
  const options: Intl.NumberFormatOptions = {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };
  return input.toLocaleString(currentLocale, options);
}

export function formatDecimal(input: number, dp: number): string {
  const options: Intl.NumberFormatOptions = {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: dp,
  };
  return input.toLocaleString(currentLocale, options);
}

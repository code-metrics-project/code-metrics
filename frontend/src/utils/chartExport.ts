import html2canvas from "html2canvas";

function fallbackTextColor(): string {
  return document.documentElement.classList.contains("dark") ? "#e5e7eb" : "#111827";
}

function resolveColorValue(value: string, fallback = "#6b7280"): string {
  if (!value) return value;
  if (!value.includes("oklch(")) return value;

  // Try converting through canvas first. Browsers typically normalize supported colors here.
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context) {
    try {
      context.fillStyle = value;
      const converted = context.fillStyle;
      if (converted && !converted.includes("oklch(")) {
        return converted;
      }
    } catch {
      // ignore and continue to DOM probe
    }
  }

  const probe = document.createElement("span");
  probe.style.color = value;
  probe.style.position = "fixed";
  probe.style.left = "-9999px";
  probe.style.top = "-9999px";
  document.body.appendChild(probe);

  const resolved = window.getComputedStyle(probe).color;
  document.body.removeChild(probe);

  if (!resolved || resolved.includes("oklch(")) {
    return fallback;
  }
  return resolved;
}

// Inline computed styles onto SVG elements to preserve colors during export
// This resolves CSS variables (like var(--chart-1)) to actual hex colors
function inlineChartColors(element: HTMLElement): { el: SVGElement; attr: string; original: string | null }[] {
  const modified: { el: SVGElement; attr: string; original: string | null }[] = [];

  // Find all SVG elements that might have colors
  const svgElements = element.querySelectorAll("path, line, circle, rect, polygon, polyline, text, g");

  svgElements.forEach((el) => {
    const svgEl = el as SVGElement;
    const computedStyle = window.getComputedStyle(svgEl);

    // Check stroke - resolve CSS variables to actual colors
    const stroke = computedStyle.stroke;
    if (stroke && stroke !== "none" && stroke !== "transparent") {
      const originalStroke = svgEl.getAttribute("stroke");
      modified.push({ el: svgEl, attr: "stroke", original: originalStroke });
      svgEl.setAttribute("stroke", resolveColorValue(stroke, "#6b7280"));
    }

    // Check fill - resolve CSS variables to actual colors
    const fill = computedStyle.fill;
    if (fill && fill !== "none" && fill !== "transparent") {
      const originalFill = svgEl.getAttribute("fill");
      modified.push({ el: svgEl, attr: "fill", original: originalFill });
      svgEl.setAttribute("fill", resolveColorValue(fill, "#6b7280"));
    }

    // Check text color
    if (el.tagName.toLowerCase() === "text") {
      const color = computedStyle.color;
      if (color) {
        const originalFill = svgEl.getAttribute("fill");
        modified.push({ el: svgEl, attr: "fill", original: originalFill });
        svgEl.setAttribute("fill", resolveColorValue(color, fallbackTextColor()));
      }
    }
  });

  return modified;
}

function inlineTextStyles(element: HTMLElement): { el: HTMLElement; attr: string; original: string | null }[] {
  const modified: { el: HTMLElement; attr: string; original: string | null }[] = [];

  const elements = element.querySelectorAll("*");
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const computedStyle = window.getComputedStyle(htmlEl);

    const color = computedStyle.color;
    if (color && color !== "transparent") {
      const originalColor = htmlEl.style.color || null;
      modified.push({ el: htmlEl, attr: "color", original: originalColor });
      htmlEl.style.color = resolveColorValue(color, fallbackTextColor());
    }

    const fill = computedStyle.fill;
    if (fill && fill !== "none" && fill !== "transparent") {
      const originalFill = htmlEl.style.fill || null;
      modified.push({ el: htmlEl, attr: "fill", original: originalFill });
      htmlEl.style.fill = resolveColorValue(fill, fallbackTextColor());
    }

    const stroke = computedStyle.stroke;
    if (stroke && stroke !== "none" && stroke !== "transparent") {
      const originalStroke = htmlEl.style.stroke || null;
      modified.push({ el: htmlEl, attr: "stroke", original: originalStroke });
      htmlEl.style.stroke = resolveColorValue(stroke, "#6b7280");
    }
  });

  return modified;
}

// Restore original attributes
function restoreChartColors(modified: { el: SVGElement; attr: string; original: string | null }[]): void {
  modified.forEach(({ el, attr, original }) => {
    if (original === null) {
      el.removeAttribute(attr);
    } else {
      el.setAttribute(attr, original);
    }
  });
}

function restoreTextStyles(modified: { el: HTMLElement; attr: string; original: string | null }[]): void {
  modified.forEach(({ el, attr, original }) => {
    if (attr === "color") {
      el.style.color = original ?? "";
      return;
    }
    if (attr === "fill") {
      el.style.fill = original ?? "";
      return;
    }
    if (attr === "stroke") {
      el.style.stroke = original ?? "";
    }
  });
}

// Replace oklch colors in all stylesheets with transparent (to avoid parsing errors)
// We do this AFTER inlining colors so the chart keeps its colors
function replaceOklchInStyles(): { element: HTMLStyleElement; original: string }[] {
  const modified: { element: HTMLStyleElement; original: string }[] = [];
  const styleElements = document.querySelectorAll("style");

  styleElements.forEach((style) => {
    const original = style.textContent || "";
    if (original.includes("oklch")) {
      modified.push({ element: style, original });
      // Replace all oklch() with transparent (since we've already inlined the colors)
      const replaced = original.replace(/oklch\([^)]*\)/g, "transparent");
      style.textContent = replaced;
    }
  });

  return modified;
}

// Restore original stylesheet content
function restoreOklchInStyles(modified: { element: HTMLStyleElement; original: string }[]): void {
  modified.forEach(({ element, original }) => {
    element.textContent = original;
  });
}

export async function exportChartAsPNG(elementRef: HTMLElement | null, fileName = "chart"): Promise<void> {
  if (!elementRef) {
    console.error("Chart element not found");
    return;
  }

  try {
    console.log("Starting PNG export...");

    // Step 1: Inline computed colors onto SVG elements BEFORE touching stylesheets
    // This captures the actual rendered colors (resolving CSS variables)
    const inlinedColors = inlineChartColors(elementRef);
    console.log("Inlined", inlinedColors.length, "color attributes");

    // Step 1b: Inline computed text styles so text remains visible after stylesheet normalization
    const inlinedTextStyles = inlineTextStyles(elementRef);
    console.log("Inlined", inlinedTextStyles.length, "text style attributes");

    // Step 2: Replace oklch colors in stylesheets (now safe since colors are inlined)
    const modifiedStyles = replaceOklchInStyles();
    console.log("Modified", modifiedStyles.length, "stylesheets");

    try {
      // Use html2canvas with proper config
      const canvas = await html2canvas(elementRef, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: false,
        allowTaint: true,
        removeContainer: false,
        imageTimeout: 10000,
      });

      downloadCanvas(canvas, fileName);
      console.log("PNG export successful");
    } finally {
      // Restore original stylesheets first
      restoreOklchInStyles(modifiedStyles);
      // Then restore original SVG attributes
      restoreChartColors(inlinedColors);
      // Then restore text styles
      restoreTextStyles(inlinedTextStyles);
    }
  } catch (error) {
    console.error("Error exporting chart as PNG:", error);
    alert(`Failed to export chart as PNG: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function downloadCanvas(canvas: HTMLCanvasElement, fileName: string): void {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${fileName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function copyChartToClipboard(elementRef: HTMLElement | null): Promise<void> {
  if (!elementRef) {
    console.error("Chart element not found");
    throw new Error("Chart element not found");
  }

  console.log("Copying chart to clipboard...");

  // Step 1: Inline computed colors onto SVG elements BEFORE touching stylesheets
  const inlinedColors = inlineChartColors(elementRef);
  console.log("Inlined", inlinedColors.length, "color attributes");

  // Step 1b: Inline computed text styles so text remains visible after stylesheet normalization
  const inlinedTextStyles = inlineTextStyles(elementRef);
  console.log("Inlined", inlinedTextStyles.length, "text style attributes");

  // Step 2: Replace oklch colors in stylesheets
  const modifiedStyles = replaceOklchInStyles();
  console.log("Modified", modifiedStyles.length, "stylesheets");

  try {
    // Use html2canvas with proper config
    const canvas = await html2canvas(elementRef, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: false,
      allowTaint: true,
      removeContainer: false,
      imageTimeout: 10000,
    });

    // Convert canvas to blob using a Promise wrapper
    const canvasBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob));
    });

    // Restore original stylesheets first
    restoreOklchInStyles(modifiedStyles);
    // Then restore original SVG attributes
    restoreChartColors(inlinedColors);
    // Then restore text styles
    restoreTextStyles(inlinedTextStyles);

    if (!canvasBlob) {
      throw new Error("Failed to create blob from canvas");
    }

    console.log("Canvas blob created, writing to clipboard");
    const item = new ClipboardItem({ "image/png": canvasBlob });
    await navigator.clipboard.write([item]);

    console.log("Chart copied to clipboard successfully");
  } catch (error) {
    // Restore on error
    restoreOklchInStyles(modifiedStyles);
    restoreChartColors(inlinedColors);
    restoreTextStyles(inlinedTextStyles);
    console.error("Error copying chart to clipboard:", error);
    alert(`Failed to copy chart: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

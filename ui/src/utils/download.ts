import { json2csv } from "json-2-csv";

/**
 * Generates a file for download.
 * @param contents
 */
export const generateFileForDownload = (contents: string) => {
  const element = document.createElement("a");
  element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(contents));
  element.setAttribute("download", "results.csv");
  element.style.display = "none";
  element.click();
};

/**
 * Export a dataset as a CSV file.
 * @param dataset
 */
export const exportDatasetAsLocalFile = (dataset: Record<string, string>[]) => {
  const csv = json2csv(dataset, { emptyFieldValue: "" });
  generateFileForDownload(csv);
};

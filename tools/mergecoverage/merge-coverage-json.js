import fs from "node:fs/promises";
import path from "node:path";
import istanbulLibCoverage from "istanbul-lib-coverage";
import { createContext } from "istanbul-lib-report";
import { create as createReport } from "istanbul-reports";
const { createCoverageMap } = istanbulLibCoverage;

const args = process.argv.slice(2); // Extract command line arguments
const DIR_PATHS = (args.length > 0 ? args[0].split(",") : ["../../backend", "../../ui"]).map((dir) =>
  path.resolve(dir),
);
const FOLDER_PREFIX = "coverage-";
const JSON_FILENAME = "coverage-final.json";
const OUTPUT_FOLDER = `${FOLDER_PREFIX}json-merged`;

console.log("Merging coverage data from directories:", DIR_PATHS);

const jsonPaths = (
  await Promise.all(
    DIR_PATHS.map(async (DIR_PATH) => {
      const dirents = await fs.readdir(DIR_PATH, { withFileTypes: true });
      const folders = dirents.filter(
        (dirent) => dirent.isDirectory() && dirent.name.startsWith(FOLDER_PREFIX) && dirent.name !== OUTPUT_FOLDER,
      );
      const jsonFilesInFolders = await Promise.all(
        folders.map(async (folder) => {
          const folderPath = path.join(DIR_PATH, folder.name);
          const files = await fs.readdir(folderPath);
          return files.includes(JSON_FILENAME) ? path.join(folderPath, JSON_FILENAME) : null;
        }),
      );
      const jsonFileInDir = (await fs.readdir(DIR_PATH)).includes(JSON_FILENAME)
        ? path.join(DIR_PATH, JSON_FILENAME)
        : null;
      return [...jsonFilesInFolders.filter(Boolean), jsonFileInDir].filter(Boolean);
    }),
  )
).flat();

if (jsonPaths.length === 0) {
  console.error("No coverage-final.json files found. All done!");
  process.exit(1);
} else {
  console.debug("Found coverage-final.json files:", jsonPaths);
}

const coverageMaps = await Promise.all(
  jsonPaths.map(async (filePath) => {
    const jsonData = JSON.parse(await fs.readFile(filePath, "utf8"));
    return createCoverageMap(jsonData);
  }),
);

// Merge all coverage maps
const mergedCoverageMap = createCoverageMap();
coverageMaps.forEach((coverageMap) => {
  mergedCoverageMap.merge(coverageMap);
});

// Ensure the output directory exists
await fs.mkdir(OUTPUT_FOLDER, { recursive: true });

// Generate HTML report using istanbul-lib-coverage, istanbul-lib-report, and istanbul-reports
console.debug(`Generating HTML report at '${path.join(OUTPUT_FOLDER, "html-report")}'`);
const context = createContext({
  dir: path.join(OUTPUT_FOLDER, "html-report"),
  coverageMap: mergedCoverageMap,
});

const report = createReport("html");
report.execute(context);

console.log(`HTML report generated at '${context.dir}'`);

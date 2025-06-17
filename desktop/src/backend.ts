import path from "path";
import { generateRandomString, getResourcesPath } from "./util/util";
import fs from "fs";
import { isDev } from "./dev";
import { SETTINGS_DIR_PATH, readConfigPath } from "./config";
import { logger, error as logError } from "./util/logger";

export async function startBackend() {
  let backendDir: string;
  if (isDev) {
    backendDir = path.resolve(__dirname, "../../backend");
  } else {
    backendDir = path.join(getResourcesPath(), "backend");
  }

  let bundledConfigDir: string;
  if (isDev) {
    bundledConfigDir = path.resolve(__dirname, "../config");
  } else {
    bundledConfigDir = path.resolve(backendDir, "config");
  }
  const userConfigDir = readConfigPath();
  const backendEntrypoint = isDev
    ? path.join(backendDir, "dist", "index.js")
    : path.join(backendDir, "index.js");

  if (!fs.existsSync(backendEntrypoint)) {
    throw new Error(`Backend entrypoint not found: ${backendEntrypoint}`);
  }

  // read from both bundled and user config directories
  process.env.CONFIG_DIR = [bundledConfigDir, userConfigDir].join(",");

  // sessions don't persist across restarts
  process.env.ACCESS_TOKEN_SECRET = generateRandomString(32);

  // use the bundled users.json file
  process.env.AUTHENTICATOR_IMPL = "file";

  // session should not expire
  process.env.ACCESS_TOKEN_TTL = "1y";

  // use the localdb datastore
  process.env.LOOKUP_CACHE_ENABLED = "true";
  process.env.DATASTORE_IMPL = "localdb";
  process.env.DATASTORE_PATH = SETTINGS_DIR_PATH;

  process.env.CORS_ORIGIN = "*";
  process.env.INVOCATION_MODE = "desktop-mode";

  try {
    logger("Starting backend at:", backendEntrypoint);
    await import(`file://${backendEntrypoint}`);
  } catch (err) {
    logError("Failed to start backend at: " + backendEntrypoint, err);
  }
}

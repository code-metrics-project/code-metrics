import fs from "fs";
import path from "path";
import { app } from "electron";
import { logger, error as logError } from "./util/logger";

const SETTINGS_DIR_NAME = ".codemetrics";
const SETTINGS_FILE_NAME = "settings.json";
export const SETTINGS_DIR_PATH = path.join(app.getPath("home"), SETTINGS_DIR_NAME);
const SETTINGS_FILE_PATH = path.join(SETTINGS_DIR_PATH, SETTINGS_FILE_NAME);

/**
 * Reads the configuration path from the settings file.
 * @returns {string | null} The saved configuration path or null if not found.
 */
export function readConfigPath(): string | null {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const settingsData = JSON.parse(fs.readFileSync(SETTINGS_FILE_PATH, "utf8"));
      return settingsData.configPath || null;
    }
  } catch (err) {
    logError("Error reading config file:", err);
  }
  return null;
}

/**
 * Saves the configuration path to the settings file.
 * @param configPath
 */
export function saveConfigPath(configPath: string): boolean {
  try {
    // Ensure the config directory exists
    if (!fs.existsSync(SETTINGS_DIR_PATH)) {
      fs.mkdirSync(SETTINGS_DIR_PATH, { recursive: true });
      logger(`Created config directory: ${SETTINGS_DIR_PATH}`);
    }

    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify({ configPath }, null, 2), "utf8");
    logger(`Saved config to: ${SETTINGS_FILE_PATH}`);
    return true;
  } catch (err) {
    logError("Error saving config file:", err);
    return false;
  }
}

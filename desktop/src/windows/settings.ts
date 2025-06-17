// Create a window for settings
import { BrowserWindow } from "electron";
import path from "path";
import { getResourcesPath } from "../util/util";
import { isDev, showConsole } from "../dev";
import { error as logError } from "../util/logger";

export function createSettingsWindow() {
  const settingsWin = new BrowserWindow({
    width: 800,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "Code Metrics Settings",
  });

  const settingsPath = `file://${path.join(getResourcesPath(), "ui", "settings", "index.html")}`;

  settingsWin.loadURL(settingsPath).catch((err) => {
    logError("Failed to load settings page:", err);
  });

  if (isDev && showConsole) {
    settingsWin.webContents.openDevTools();
  }

  return settingsWin;
}

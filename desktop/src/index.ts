import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { isDev, showConsole, terminateFrontendProcess } from "./dev";
import { createMainWindow, mainWindowVisible, startMainApp } from "./windows/main";
import { readConfigPath, saveConfigPath } from "./config";
import { createSettingsWindow } from "./windows/settings";
import { logger } from "./util/logger";

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on("second-instance", () => {
    const existingWindow = BrowserWindow.getAllWindows()[0];
    if (existingWindow) {
      if (existingWindow.isMinimized()) existingWindow.restore();
      existingWindow.focus();
    }
  });
}

logger("isDev:", isDev);
logger("showConsole:", showConsole);

// Setup IPC handlers
function setupIPC() {
  // Open directory dialog
  ipcMain.handle("open-directory-dialog", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result;
  });

  // Get config path
  ipcMain.handle("get-config-path", () => {
    return readConfigPath();
  });

  // Save config path
  ipcMain.handle("save-config-path", (_, configPath) => {
    return saveConfigPath(configPath);
  });

  // Handle settings saved notification - start the main app directly without waiting for window close
  ipcMain.handle("settings-saved", async () => {
    logger("Settings saved notification received, starting application");
    // Start the normal flow when settings are saved through the button
    await startMainApp();
    return true;
  });
}

app.whenReady().then(async () => {
  setupIPC();

  // Check if config directory has been saved
  const savedConfigPath = readConfigPath();

  if (!savedConfigPath) {
    // No config directory saved, show settings window
    logger("No configuration directory found, showing settings window");
    createSettingsWindow();
  } else {
    // Config directory already saved, continue with normal startup
    logger("Configuration directory found:", savedConfigPath);
    await startMainApp();
  }
});

app.on("window-all-closed", () => {
  // override default behavior to keep the app running unless the main window was just closed
  if (process.platform !== "darwin") {
    terminateFrontendProcess();
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

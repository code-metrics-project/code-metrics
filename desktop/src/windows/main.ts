import { app, BrowserWindow, Menu } from "electron";
import path from "path";
import { getResourcesPath, waitForUrl } from "../util/util";
import { isDev, showConsole, startFrontendDevServer } from "../dev";
import { startBackend } from "../backend";
import { createSettingsWindow } from "./settings";
import { error as logError, logger } from "../util/logger";

const frontendReadyUrl = process.env.FE_HEALTH_URL ?? "http://localhost:3001/login";
const backendReadyUrl = process.env.BE_HEALTH_URL ?? "http://localhost:3000/api/health/liveness";

let mainWindow: BrowserWindow | null = null;
export let mainWindowVisible = false;

const setMainWindow = (win: BrowserWindow) => {
  mainWindow = win;
  if (mainWindow) {
    mainWindowVisible = true;
  }
};

// Create the application menu
function createAppMenu() {
  const isMac = process.platform === "darwin";

  // Function to open settings and close main window
  const openSettings = () => {
    // Close main window if it exists¬
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindowVisible = false;
      mainWindow.close();
    }

    // Create and show settings window
    createSettingsWindow();
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              {
                label: "Preferences...",
                accelerator: "Command+,",
                click: openSettings,
              },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        ...(isMac
          ? []
          : [
              {
                label: "Settings",
                accelerator: "Ctrl+,",
                click: openSettings,
              },
              { type: "separator" },
            ]),
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac
          ? [
              { role: "pasteAndMatchStyle" },
              { role: "delete" },
              { role: "selectAll" },
              { type: "separator" },
            ]
          : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [{ type: "separator" }, { role: "front" }, { type: "separator" }, { role: "window" }]
          : [{ role: "close" }]),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "Learn More",
          click: async () => {
            const { shell } = require("electron");
            await shell.openExternal("https://github.com/DeloitteDigitalUK/code-metrics");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  return { setMainWindow };
}

export function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
    },
  });

  const frontendURL = isDev
    ? "http://localhost:3001"
    : `file://${path.join(getResourcesPath(), "ui", "index.html")}`;

  logger("Loading frontend from:", frontendURL);

  if (isDev && showConsole) {
    win.webContents.openDevTools();
  }

  win.webContents.on("did-fail-load", (e, code, desc) => {
    logError(`Failed to load: ${desc} (code ${code})`);
  });

  win.loadURL(frontendURL).catch((err) => {
    logError("Failed to load frontend:", err);
  });

  createAppMenu();
  setMainWindow(win);
}

export async function startMainApp() {
  // we want the main window to be created immediately, so we
  // start the backend asynchronously - the frontend will retry until it is available
  startBackend().then(
    async () => {
      await waitForUrl("Backend", backendReadyUrl);
      logger("Backend started successfully");
    },
    (reason) => {
      logError("Failed to start backend:", reason);
    }
  );

  if (isDev) {
    process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
    try {
      startFrontendDevServer();
    } catch (err) {
      logError("Failed to start frontend dev server:", err);
    }

    try {
      await waitForUrl("Frontend", frontendReadyUrl);
    } catch (err) {
      logError("Frontend failed to start in time:", err);
    }
  }

  createMainWindow();
}

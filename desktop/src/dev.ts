import { spawn } from "node:child_process";
import path from "path";
import { logger } from "./util/logger";

export const isDev = process.env.NODE_ENV === "development";
export const showConsole = process.env.SHOW_CONSOLE === "true";

let frontendProcess: ReturnType<typeof spawn> | null = null;

export const startFrontendDevServer = () => {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";

  logger("Starting frontend (Vite) dev server...");

  frontendProcess = spawn(command, ["run", "dev"], {
    cwd: path.resolve(__dirname, "../../ui"),
    stdio: "inherit",
    shell: true,
  });

  frontendProcess.on("exit", (code) => {
    logger(`Frontend (Vite) exited with code ${code}`);
  });

  process.on("exit", () => {
    frontendProcess?.kill();
  });
};

export const terminateFrontendProcess = () => {
  frontendProcess?.kill();
};

import { Request, Response } from "express";
import path from "path";
import { getConfigDirs } from "../config/config";
import { readFile } from "fs/promises";
import { verbose } from "../utils/logger/logger";

type TDashboards = {
  id: string;
  name: string;
}[];

export const getDashboards = async (req: Request, res: Response<TDashboards>) => {
  res.json((await loadStoredDashboards()).map(({ id, name }) => ({ id, name })));
};

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  const dashboard = (await loadStoredDashboards()).find((dashboard) => dashboard.id === req.params.id);
  if (!dashboard) {
    res.status(404);
    res.json({ id: "", name: "", data: [] });
  } else {
    res.json(dashboard);
  }
};

const loadStoredDashboards = async (): Promise<TDashboards> => {
  const dash: TDashboards = [];
  for (const configDir of getConfigDirs()) {
    const dashboardConfigFile = path.join(configDir, "/dashboard-config.json");
    let dashboards: Buffer;
    try {
      dashboards = await readFile(dashboardConfigFile);
    } catch (e) {
      verbose(`Failed to read dashboard config file: ${dashboardConfigFile}`);
    }
    dash.push(...(dashboards ? JSON.parse(dashboards.toString()) : []));
  }
  return dash;
};

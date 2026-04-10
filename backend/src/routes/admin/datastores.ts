import { Request, Response } from "express";
import { provideDatastoreAdmin } from "../../db/factory";
import { error, logger } from "../../utils/logger/logger";
import { serverError } from "../../utils/responses";

/**
 * GET /api/datastores
 * Lists all physical collections/tables in the active storage engine.
 */
export const listDatastores = async (_req: Request, res: Response): Promise<void> => {
  const admin = provideDatastoreAdmin();
  if (!admin) {
    serverError(res, { error: "Datastore admin not available" });
    return;
  }
  try {
    const collections = await admin.listCollections();
    res.status(200).json({ collections });
  } catch (e) {
    error("Failed to list datastore collections", e);
    serverError(res, { error: "Failed to list datastore collections" });
  }
};

/**
 * GET /api/datastores/exists?name=X
 * Checks whether a specific collection/table exists.
 */
export const datastoreExists = async (req: Request, res: Response): Promise<void> => {
  const admin = provideDatastoreAdmin();
  if (!admin) {
    serverError(res, { error: "Datastore admin not available" });
    return;
  }
  const name = req.query.name as string;
  if (!name) {
    res.status(400).json({ error: "Missing required query parameter: name" });
    return;
  }
  try {
    const exists = await admin.collectionExists(name);
    res.status(200).json({ name, exists });
  } catch (e) {
    error(`Failed to check existence of collection '${name}'`, e);
    serverError(res, { error: `Failed to check existence of collection '${name}'` });
  }
};

/**
 * GET /api/datastores/count?name=X
 * Counts items in a specific collection/table. This is potentially expensive.
 */
export const countDatastoreItems = async (req: Request, res: Response): Promise<void> => {
  const admin = provideDatastoreAdmin();
  if (!admin) {
    serverError(res, { error: "Datastore admin not available" });
    return;
  }
  const name = req.query.name as string;
  if (!name) {
    res.status(400).json({ error: "Missing required query parameter: name" });
    return;
  }
  try {
    const count = await admin.countItems(name);
    res.status(200).json({ name, count });
  } catch (e) {
    error(`Failed to count items in collection '${name}'`, e);
    serverError(res, { error: `Failed to count items in collection '${name}'` });
  }
};

/**
 * POST /api/datastores/empty
 * Empties (deletes all items in) a specific collection/table.
 * Request body: { name: string }
 */
export const emptyDatastore = async (req: Request, res: Response): Promise<void> => {
  const admin = provideDatastoreAdmin();
  if (!admin) {
    serverError(res, { error: "Datastore admin not available" });
    return;
  }
  const name = req.body?.name as string;
  if (!name) {
    res.status(400).json({ error: "Missing required body parameter: name" });
    return;
  }
  try {
    logger(`Emptying datastore collection '${name}'`);
    await admin.emptyCollection(name);
    logger(`Emptied datastore collection '${name}'`);
    res.sendStatus(204);
  } catch (e) {
    error(`Failed to empty collection '${name}'`, e);
    serverError(res, { error: `Failed to empty collection '${name}'` });
  }
};

import { Request, Response } from "express";
import { StoredQueryCollection, StoredQueryCollectionMeta } from "../model/query";
import { getActiveStoredQueryService } from "../services/storedQuery/storedQueryService";
import * as core from "express-serve-static-core";

// e.g. PUT /api/queries/:collection
export const saveQueryCollection = async (
  req: Request<core.ParamsDictionary, any, StoredQueryCollection>,
  res: Response,
) => {
  const queryService = getActiveStoredQueryService();
  if (req.params.collectionId !== req.body.id) {
    res.status(400).send("Collection name in URL does not match collection ID in body");
    return;
  }
  await queryService.storeCollection(req.body);
  res.sendStatus(201);
};

// e.g. GET /api/queries/:collection
export const getQueryCollection = async (req: Request, res: Response<StoredQueryCollection>) => {
  const queryService = getActiveStoredQueryService();
  res.json(await queryService.loadCollection(req.params.collectionId));
};

// e.g. DELETE /api/queries/:collection
export const deleteQueryCollection = async (req: Request, res: Response) => {
  const queryService = getActiveStoredQueryService();
  await queryService.deleteCollection(req.params.collectionId);
  res.sendStatus(204);
};

// e.g. GET /api/queries
export const listQueryCollections = async (req: Request, res: Response<StoredQueryCollectionMeta[]>) => {
  const queryService = getActiveStoredQueryService();
  res.json(await queryService.listCollections());
};

import { StoredQueryCollection, StoredQueryCollectionMeta } from "../../model/query";
import { getFileStoredQueryService } from "./file";
import { logger } from "../../utils/logger/logger";
import { getDatastoreStoredQueryService } from "./datastore";
import { getUnionStoredQueryService } from "./union";

const DEFAULT_STORED_QUERY_SERVICE = "union";
const instances: Record<string, StoredQueryService> = {};

export const getActiveStoredQueryService = (): StoredQueryService =>
  getStoredQueryService(process.env.STORED_QUERY_SERVICE ?? DEFAULT_STORED_QUERY_SERVICE);

export const getStoredQueryService = (implName: string): StoredQueryService => {
  let instance = instances[implName];
  if (!instance) {
    switch (implName) {
      case "file":
        instance = getFileStoredQueryService();
        break;
      case "datastore":
        instance = getDatastoreStoredQueryService();
        break;
      case "union":
        instance = getUnionStoredQueryService();
        break;
      default:
        throw new Error(`Unsupported stored query implementation: ${implName}`);
    }
    instances[implName] = instance;
    logger(`Using ${implName} stored query service`);
  }
  return instance;
};

export type StoredQueryService = {
  listCollections(): Promise<StoredQueryCollectionMeta[]>;

  loadCollection(collectionId: string): Promise<StoredQueryCollection | null>;

  storeCollection(collection: StoredQueryCollection): Promise<void>;

  deleteCollection(collectionId: string): Promise<void>;
};

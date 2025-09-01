import { AbstractDatastore, DatastoreCollection, DatastoreConfig, EXPIRY_FIELD, QueryFilter } from "../api";
import cloneDeep from "lodash/cloneDeep";
import { error, logger, verbose } from "../../utils/logger/logger";
import Datastore from "@seald-io/nedb";
import path from "path";
import { getConfigItem } from "../../config/sources/source";

let dbDir: string | undefined;
const collections = new Map<string, Datastore>();

export const initNeDB = async (filePath?: string): Promise<void> => {
  collections.clear();
  dbDir = filePath ?? getConfigItem("DATASTORE_PATH");
};

/**
 * Get or create a NeDB datastore instance for the specified collection.
 * @param collectionName
 */
const getDatastore = (collectionName: string): Datastore => {
  let db = collections.get(collectionName);
  if (!db) {
    if (!dbDir) {
      logger("Datastore path not set, using in-memory datastore");
      db = new Datastore();
    } else {
      logger(`Using NeDB datastore at ${dbDir}`);
      db = new Datastore({ filename: path.join(dbDir, `code-metrics-${collectionName}.db`), autoload: true });
    }
    collections.set(collectionName, db);
  }
  return db;
};

export class NeDBDatastore extends AbstractDatastore<QueryFilter, NeDBCollection> {
  connect = async <T>(collectionName: string, operation: (collection: NeDBCollection) => Promise<T>): Promise<T> => {
    try {
      const db = getDatastore(collectionName);
      if (this.config.expiryEnabled) {
        db.ensureIndex({ fieldName: EXPIRY_FIELD, expireAfterSeconds: 0 });
      }
      const col = new NeDBCollection(db, this.config);
      return await operation(col);
    } catch (err) {
      error(`Datastore operation failed on '${collectionName}'`, err);
      throw err;
    }
  };
}

const normalizeFromDb = (item: Record<string, any>): Record<string, any> => {
  const out = { ...item };
  if (out[EXPIRY_FIELD] && typeof out[EXPIRY_FIELD] === "string") {
    const parsed = new Date(out[EXPIRY_FIELD]);
    if (!isNaN(parsed.getTime())) {
      out[EXPIRY_FIELD] = parsed;
    }
  }
  return out;
};

export class NeDBCollection implements DatastoreCollection {
  constructor(
    private readonly db: Datastore,
    private readonly config: DatastoreConfig,
  ) {}

  findOne = async (filter: QueryFilter): Promise<Record<string, any> | null> => {
    return new Promise((resolve, reject) => {
      this.db.findOne(filter, async (err, doc) => {
        if (err) return reject(err);
        if (!doc) return resolve(null);

        const normalized = normalizeFromDb(doc);
        const expiresAt = normalized[EXPIRY_FIELD];
        if (this.config.expiryEnabled && expiresAt && expiresAt <= new Date()) {
          verbose("Item expired", normalized);
          await this.deleteOne(filter);
          return resolve(null);
        }

        resolve(cloneDeep(normalized));
      });
    });
  };

  insertOne = async (filter: QueryFilter, item: Record<string, any>): Promise<boolean> => {
    const toInsert = { ...filter, ...item };
    if (this.config.expiryEnabled && this.config.expireAfterSeconds && !toInsert[EXPIRY_FIELD]) {
      toInsert[EXPIRY_FIELD] = new Date(Date.now() + this.config.expireAfterSeconds * 1000);
    }
    return new Promise((resolve, reject) => {
      this.db.update(filter, toInsert, { upsert: true }, (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  };

  deleteOne = async (filter: QueryFilter): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      this.db.remove(filter, { multi: false }, (err, count) => {
        if (err) return reject(err);
        if (count === 0) {
          verbose("Did not find item to delete", filter);
          return resolve(false);
        } else {
          verbose("Deleted item", filter);
          return resolve(true);
        }
      });
    });
  };

  listItems = async (): Promise<Record<string, any>[]> => {
    return new Promise((resolve, reject) => {
      this.db.find({}, (err, docs) => {
        if (err) return reject(err);
        resolve(docs.map(normalizeFromDb));
      });
    });
  };

  deleteAll = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.remove({}, { multi: true }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  };
}

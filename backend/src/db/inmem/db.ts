import { AbstractDatastore, DatastoreCollection, DatastoreConfig, EXPIRY_FIELD, QueryFilter } from "../api";
import { isMatch, cloneDeep } from "lodash/lang";
import { error, verbose } from "../../utils/logger/logger";

/**
 * In memory datastore.
 *
 * This datastore implementation holds all items in memory for the
 * lifetime of the process. There is no eviction, so growth is infinite
 * with continued insertions. Do not use this in production.
 */

class InMemoryCollection implements DatastoreCollection {
  private items: Record<string, any>[] = [];
  private config: DatastoreConfig;

  constructor(config: DatastoreConfig) {
    this.config = config;
  }

  findOne = async (filter: QueryFilter) => {
    const item = this.items.find((item) => {
      // Note on isMatch (see https://lodash.com/docs/4.17.15#isMatch)
      // "Performs a partial deep comparison between object and source
      // to determine if object contains equivalent property values."
      return isMatch(item, filter);
    });

    // lazy eviction
    if (this.config.expiryEnabled && item && item[EXPIRY_FIELD] && item[EXPIRY_FIELD] <= new Date()) {
      verbose(`Item has expired`, item);
      const itemIndex = this.items.indexOf(item);
      if (itemIndex > -1) {
        this.items.splice(itemIndex, 1);
      }
      return null;
    } else {
      // don't return the internal object
      return cloneDeep(item);
    }
  };

  insertOne = async (key: QueryFilter, item) => {
    // don't reference the external object
    this.items.push(cloneDeep(item));
    return true;
  };

  deleteOne = async (filter: QueryFilter) => {
    const match = this.items.find((item) => {
      return isMatch(item, filter);
    });
    if (match) {
      const itemIndex = this.items.indexOf(match);
      if (itemIndex > -1) {
        this.items.splice(itemIndex, 1);
        verbose(`Deleted item`, filter);
        return true;
      } else {
        verbose(`Did not find item to delete`, filter);
        return false;
      }
    } else {
      verbose(`Did not find item to delete matching filter`, filter);
      return false;
    }
  };

  listItems = async () => {
    // don't leak the internal array or objects
    return this.items.map((item) => cloneDeep(item));
  };

  deleteAll = async () => {
    this.items = [];
  };
}

const store: Record<string, InMemoryCollection> = {};

const addCollection = (name: string, config: DatastoreConfig): InMemoryCollection => {
  const col = new InMemoryCollection(config);
  store[name] = col;
  return col;
};

export class InMemoryDatastore extends AbstractDatastore<QueryFilter, InMemoryCollection> {
  connect = async <T>(
    collectionName: string,
    operation: (collection: InMemoryCollection) => Promise<T>,
  ): Promise<T> => {
    try {
      const col = store[collectionName] ?? addCollection(collectionName, this.config);
      return await operation(col);
    } catch (e) {
      error(`Datastore operation failed on '${collectionName}'`, e);
      throw e;
    }
  };
}

export const testables = {
  clearState: () => {
    for (const key in store) {
      delete store[key];
    }
  },
};

import { isToday } from "date-fns";
import { error, logger, verbose, warn } from "../utils/logger/logger";
import { addSeconds } from "date-fns";

export type QueryFilter = Record<any, any>;

export type DatastoreCollection = {
  findOne(filter: QueryFilter): Promise<Record<string, any> | null>;

  insertOne(key: QueryFilter, item): Promise<boolean>;

  deleteOne(filter: QueryFilter): Promise<boolean>;

  listItems(): Promise<Record<string, any>[]>;

  deleteAll(): Promise<void>;
};

export type BaseDatastoreConfig = {
  expireAfterSeconds: number;
  persistentStore?: boolean;
  ttlIfToday: number;
};

export type DatastoreConfig = BaseDatastoreConfig & {
  implName: string;
  storeEnabled: boolean;
  expiryEnabled: boolean;
};

type CacheBehaviour = {
  store: boolean;
  expire: boolean;
  ttl?: number;
};

export const EXPIRY_FIELD = "expireAt";
export const DO_NOT_EXPIRE = -1;

export type Datastore<F extends QueryFilter, C extends DatastoreCollection> = {
  connect<T>(collectionName: string, operation: (collection: C) => Promise<T>): Promise<T>;

  /**
   * Look for a single item matching the given `filter` in the datastore. If an item is found,
   * it is returned. If no item is found, the `populator` function is invoked, and its
   * result stored in the datastore, then returned.
   * @param collectionName
   * @param filter
   * @param populator
   * @param validator
   */
  findOrInsertOne<T extends F>(
    collectionName: string,
    filter: F,
    populator: (old: T | null) => Promise<T>,
    validator?: (item: T | null) => boolean,
  ): Promise<T>;

  /**
   * Look for a single item matching the given `filter` in the datastore. If an item is found,
   * it is returned. If no item is found, the `populator` function is invoked, and its
   * result stored in the datastore, then returned.
   * @param collectionName
   * @param date
   * @param filter
   * @param populator
   * @param validator
   */
  findOrInsertOneDated<T extends F>(
    collectionName: string,
    date: Date,
    filter: F,
    populator: (old?: T) => Promise<T>,
    validator?: (item?: T) => boolean,
  ): Promise<T>;

  /**
   * Delete all items in the collection.
   * @param collectionName
   */
  deleteAll(collectionName: string): Promise<void>;
};

export abstract class AbstractDatastore<F extends QueryFilter, C extends DatastoreCollection>
  implements Datastore<F, C>
{
  protected config: DatastoreConfig;

  constructor(config: DatastoreConfig) {
    this.config = config;
  }

  abstract connect<T>(collectionName: string, operation: (collection: C) => Promise<T>): Promise<T>;

  findOrInsertOne = async <T extends F>(
    collectionName: string,
    filter: F,
    populator: (old: T | null) => Promise<T>,
    validator?: (item: T | null) => boolean,
  ): Promise<T> =>
    this.findOrInsertOneInternal(collectionName, filter, buildBehaviour(this.config), populator, validator);

  findOrInsertOneDated = async <T extends F>(
    collectionName: string,
    date: Date,
    filter: F,
    populator: (old: T | null) => Promise<T>,
    validator?: (item: T | null) => boolean,
  ): Promise<T> =>
    this.findOrInsertOneInternal(collectionName, filter, buildBehaviour(this.config, date), populator, validator);

  /**
   * Look for a single item matching the given `filter` in the datastore. If an item is found,
   * it is returned. If no item is found, the `populator` function is invoked, and its
   * result stored in the datastore, then returned.
   * @param collectionName
   * @param filter
   * @param behaviour
   * @param populator
   * @param validator
   */
  findOrInsertOneInternal = async <T extends F>(
    collectionName: string,
    filter: F,
    behaviour: CacheBehaviour,
    populator: (old: T | null) => Promise<T>,
    validator: (item: T | null) => boolean = defaultCacheValidator,
  ): Promise<T> => {
    let cached;
    if (behaviour.store) {
      try {
        cached = await this.connect(collectionName, async (col) => {
          const cached = await col.findOne(filter);
          return cached as unknown as T;
        });
      } catch (e) {
        error(`Error finding item in ${collectionName} for`, filter, e);
        throw e;
      }
    }

    try {
      const valid = validator(cached);
      if (cached && !valid) {
        logger(`Removing invalid cached item in ${collectionName} with key`, filter);
        await this.connect(collectionName, async (col) => {
          await col.deleteOne(cached);
        });
      }

      if (valid) {
        logger(`Cache hit in ${collectionName} for`, filter);
        return cached as unknown as F & T;
      } else {
        logger(`Cache miss in ${collectionName} for`, filter);
        const item = await this.populate(cached, populator);
        if (behaviour.store) {
          if (behaviour.expire) {
            item[EXPIRY_FIELD] = addSeconds(new Date(), behaviour.ttl);
          }
          await this.connect(collectionName, async (col) => {
            await col.insertOne(filter, item);
          });
        }
        return item;
      }
    } catch (e) {
      warn(`Error inserting item in ${collectionName} for`, filter, e.message);
      verbose(e);
      throw e;
    }
  };

  /**
   * @param old - the old item, if any - an item might exist but have failed validation
   * @param populator
   * @private
   */
  private async populate<T>(old: T | null, populator: (old: T | null) => Promise<T>): Promise<T & { [EXPIRY_FIELD]?: Date }> {
    let item: T & { [EXPIRY_FIELD]?: Date };
    try {
      item = await populator(old);
    } catch (e) {
      throw new Error(`Item populator failed: ${e}`);
    }
    return item;
  }

  deleteAll = async (collectionName: string) => {
    logger(`Deleting all items in ${collectionName}`);
    await this.connect(collectionName, async (col) => {
      await col.deleteAll();
    });
    logger(`Deleted all items in ${collectionName}`);
  };
}

const buildBehaviour = (config: DatastoreConfig, date?: Date): CacheBehaviour => {
  let ttl: number | undefined;
  if (date === null || !isToday(date) || config.ttlIfToday === DO_NOT_EXPIRE) {
    ttl = config.expireAfterSeconds;
  } else {
    // add ttl for data for the current day, as it may be incomplete
    ttl = config.ttlIfToday;
  }
  return {
    store: config.storeEnabled,
    expire: ttl !== undefined && ttl != DO_NOT_EXPIRE,
    ttl,
  };
};

const defaultCacheValidator = (item: any | null): boolean => {
  return item !== undefined && item !== null;
};

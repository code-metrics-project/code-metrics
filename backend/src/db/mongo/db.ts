import { Collection, Db, Document, Filter, MongoClient } from "mongodb";
import { AbstractDatastore, DatastoreCollection, EXPIRY_FIELD, QueryFilter } from "../api";
import { error, logger, verbose, warn } from "../../utils/logger/logger";
import { getConfigItem } from "../../config/sources/source";

/**
 * MongoDB datastore.
 *
 * This datastore implementation holds items in an external MongoDB
 * instance. It requires configuration of the connection and
 * authentication details for the MongoDB server.
 */

const DEFAULT_DATABASE_NAME = "code-metrics";

type DatabaseConfig = {
  uri: string;
  name: string;
};

let config: DatabaseConfig;
let client: MongoClient;

/**
 * Invoke once per https://mongodb.github.io/node-mongodb-native/driver-articles/mongoclient.html#mongoclient-connection-pooling
 */
export const initMongoDb = async () => {
  const dbUri = getConfigItem("DATABASE_URI");
  if (!dbUri) {
    throw new Error("DATABASE_URI must be set");
  }
  let dbName = getConfigItem("DATABASE_NAME");
  if (!dbName) {
    logger(`Using default database name: ${DEFAULT_DATABASE_NAME}`);
    dbName = DEFAULT_DATABASE_NAME;
  }
  config = {
    uri: dbUri,
    name: dbName,
  };
  client = await MongoClient.connect(config.uri);
};

const EXPIRY_INDEX = "expiry";

/**
 * Lightweight adapter over a MongoDB collection.
 */
class MongoCollection implements DatastoreCollection {
  private col: Collection;

  constructor(col: Collection) {
    this.col = col;
  }

  findOne = async (filter: QueryFilter) => {
    return await this.col.findOne(filter);
  };

  insertOne = async (key: QueryFilter, item) => {
    const result = await this.col.insertOne(item);
    return result.acknowledged;
  };

  deleteOne = async (filter: QueryFilter) => {
    const result = await this.col.deleteOne(filter);
    if (result.deletedCount === 0) {
      verbose(`Did not find item to delete`, filter);
      return false;
    } else {
      verbose(`Deleted item`, filter);
      return true;
    }
  };

  listItems = async () => {
    return this.col.find().toArray();
  };

  deleteAll = async () => {
    await this.col.deleteMany({});
  };
}

export class MongoDatastore extends AbstractDatastore<Filter<Document>, MongoCollection> {
  connect = async <T>(collectionName: string, operation: (collection: MongoCollection) => Promise<T>): Promise<T> => {
    try {
      const database = client.db(config.name);
      if (!(await this.doesCollectionExist(database, collectionName))) {
        if (!this.config.autoCreate) {
          const msg = `Collection '${collectionName}' does not exist and DATASTORE_AUTO_CREATE is disabled. Create the collection manually or set DATASTORE_AUTO_CREATE=true.`;
          error(msg);
          throw new Error(msg);
        }
        logger(`Creating collection: ${collectionName}`);
        try {
          await database.createCollection(collectionName);
        } catch (e) {
          // check if the collection already exists, to avoid a race
          if (!(await this.doesCollectionExist(database, collectionName))) {
            throw new Error(`Failed to create collection ${collectionName}: ${e}`);
          }
        }
      }
      const mongoCollection = database.collection(collectionName);
      if (this.config.expiryEnabled) {
        await this.configureExpiration(mongoCollection, collectionName);
      }
      const col = new MongoCollection(mongoCollection);
      return await operation(col);
    } catch (e) {
      error(`Datastore operation failed on '${collectionName}'`, e);
      throw e;
    }
  };

  private doesCollectionExist = async (db: Db, collectionName: string): Promise<boolean> => {
    const cursor = db.listCollections({ name: collectionName });
    const result = await cursor.hasNext();
    await cursor.close();

    return result;
  };

  /**
   * Ensure the expiry index exists on the collection.
   * See https://www.mongodb.com/docs/manual/tutorial/expire-data/
   * @param col
   * @param collectionName
   * @private
   */
  private configureExpiration = async (col: Collection<Document>, collectionName: string) => {
    if (await col.indexExists(EXPIRY_INDEX)) {
      verbose(`Expiry index ${EXPIRY_INDEX} already exists on collection: ${collectionName}`);
    } else {
      if (!this.config.autoCreate) {
        warn(`Expiry index '${EXPIRY_INDEX}' does not exist on collection '${collectionName}' and DATASTORE_AUTO_CREATE is disabled. TTL expiration will not function until the index is created manually or DATASTORE_AUTO_CREATE is enabled.`);
        return;
      }
      logger(`Creating expiry index '${EXPIRY_INDEX}' on collection: ${collectionName}`);
      await col.createIndex({ [EXPIRY_FIELD]: 1 }, { expireAfterSeconds: 0, name: EXPIRY_INDEX });
      logger(`Created expiry index '${EXPIRY_INDEX}' on collection: ${collectionName}`);
    }
  };
}

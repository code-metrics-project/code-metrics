import { StoredQueryCollection, StoredQueryCollectionMeta } from "../../model/query";
import { StoredQueryService } from "./storedQueryService";
import { logger, verbose } from "../../utils/logger/logger";
import { provideDatastore } from "../../db/factory";

export const getDatastoreStoredQueryService = (): StoredQueryService => new DatastoreStoredQueryService();

const COLLECTION_NAME = "queries";

type QueryCollectionFilter = {
  id: string;
};

export class DatastoreStoredQueryService implements StoredQueryService {
  private datastore = provideDatastore<QueryCollectionFilter>("saved-queries", {});

  async listCollections(): Promise<StoredQueryCollectionMeta[]> {
    try {
      const collections = await this.datastore.connect(COLLECTION_NAME, async (col) => {
        return (await col.listItems()) as StoredQueryCollectionMeta[];
      });
      verbose(`Found ${collections.length} collections in datastore: ${COLLECTION_NAME}`, collections);
      return collections;
    } catch (e) {
      throw new Error(`Failed to list query collections from datastore: ${COLLECTION_NAME}: ${e}`);
    }
  }

  async loadCollection(collectionId: string): Promise<StoredQueryCollection | null> {
    logger(`Loading queries for collection: ${collectionId} in datastore: ${COLLECTION_NAME}`);
    try {
      return await this.datastore.connect(COLLECTION_NAME, async (col) => {
        return (await col.findOne(this.buildKey(collectionId))) as StoredQueryCollection;
      });
    } catch (e) {
      throw new Error(`Failed to load query collection: ${collectionId} from datastore: ${COLLECTION_NAME}: ${e}`);
    }
  }

  async storeCollection(collection: StoredQueryCollection): Promise<void> {
    logger(`Saving queries for collection: ${collection.id} in datastore: ${COLLECTION_NAME}`);
    try {
      await this.datastore.connect(COLLECTION_NAME, async (col) => {
        const key = this.buildKey(collection.id);
        await col.deleteOne(key);
        await col.insertOne(key, collection);
      });
    } catch (e) {
      throw new Error(`Failed to store query collection: ${collection.id} from datastore: ${COLLECTION_NAME}: ${e}`);
    }
  }

  async deleteCollection(collectionId: string): Promise<void> {
    logger(`Deleting queries for collection: ${collectionId} in datastore: ${COLLECTION_NAME}`);
    try {
      await this.datastore.connect(COLLECTION_NAME, async (col) => {
        await col.deleteOne(this.buildKey(collectionId));
      });
    } catch (e) {
      throw new Error(`Failed to delete query collection: ${collectionId} from datastore: ${COLLECTION_NAME}: ${e}`);
    }
  }

  private buildKey(collectionId: string): QueryCollectionFilter {
    return { id: collectionId };
  }
}

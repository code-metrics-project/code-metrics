import { StoredQueryCollection, StoredQueryCollectionMeta } from "../../model/query";
import { getStoredQueryService, StoredQueryService } from "./storedQueryService";
import { verbose } from "../../utils/logger/logger";
import { getConfigItem } from "../../config/sources/source";

export const getUnionStoredQueryService = (): StoredQueryService => new UnionStoredQueryService();

/**
 * A StoredQueryService implementation that unions the results of two other services.
 * The read-write implementation takes precedence over the read-only implementation.
 */
export class UnionStoredQueryService implements StoredQueryService {
  private readOnlyImpl: StoredQueryService;
  private readWriteImpl: StoredQueryService;

  constructor() {
    this.readOnlyImpl = getStoredQueryService(getConfigItem("STORED_QUERY_SERVICE_RO", "file"));
    this.readWriteImpl = getStoredQueryService(getConfigItem("STORED_QUERY_SERVICE_RW", "datastore"));
  }

  async listCollections(): Promise<StoredQueryCollectionMeta[]> {
    const collections = await this.readWriteImpl.listCollections();

    // Merge in read-only collections
    // The read-write implementation takes precedence, so we only add collections
    // from the read-only implementation if they are not already present.
    const readOnlyCollections = await this.readOnlyImpl.listCollections();
    for (const roCollection of readOnlyCollections) {
      if (!collections.find((c) => c.id === roCollection.id)) {
        collections.push(roCollection);
      }
    }
    verbose(`Found ${collections.length} collections`, collections);
    return collections;
  }

  async loadCollection(collectionId: string): Promise<StoredQueryCollection | null> {
    // Read-write implementation takes precedence
    const collection = await this.readWriteImpl.loadCollection(collectionId);
    if (collection) {
      return collection;
    }
    return this.readOnlyImpl.loadCollection(collectionId);
  }

  async storeCollection(collection: StoredQueryCollection): Promise<void> {
    await this.readWriteImpl.storeCollection(collection);
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.readWriteImpl.deleteCollection(collectionId);
  }
}

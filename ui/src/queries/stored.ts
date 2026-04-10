import { type StoredQueryCollection, type StoredQueryCollectionMeta } from "@/model/query";
import { client } from "@/utils/apiClient";
import { STORED_QUERY, SAVED_QUERY_COLLECTIONS } from "@/utils/urls";
import { logger } from "@/utils/logger";

const collections: Record<string, StoredQueryCollection> = {};

export async function getQueryCollection(collectionId: string): Promise<StoredQueryCollection | null> {
  if (!collections[collectionId]) {
    try {
      const response = await client.get<StoredQueryCollection>(STORED_QUERY(collectionId));
      collections[collectionId] = response.data;
    } catch (e) {
      logger(`Failed to list saved queries: ${e}`);
      return null;
    }
  }
  return collections[collectionId];
}

export async function saveQueryCollection(collection: StoredQueryCollection): Promise<void> {
  try {
    logger(`Saving queries to collection: ${collection.id}`);
    await client.put(`${STORED_QUERY(collection.id)}`, collection);

    // update the local cache
    collections[collection.id] = collection;
  } catch (e) {
    throw new Error(`Error saving queries to collection: ${collection}: ${e}`);
  }
}

export async function deleteQueryCollection(collectionId: string): Promise<void> {
  try {
    logger(`Deleting queries in collection: ${collectionId}`);
    await client.delete(`${STORED_QUERY(collectionId)}`);

    // update the local cache
    delete collections[collectionId];
  } catch (e) {
    throw new Error(`Error deleting queries in collection: ${collectionId}: ${e}`);
  }
}

export async function listQueryCollections(): Promise<StoredQueryCollectionMeta[]> {
  try {
    logger(`Listing saved query collections`);
    const collections = (await client.get<StoredQueryCollectionMeta[]>(`${SAVED_QUERY_COLLECTIONS}`)).data;
    logger(`Found collections`, collections);
    return collections;
  } catch (e) {
    throw new Error(`Failed to list saved queries: ${e}`);
  }
}

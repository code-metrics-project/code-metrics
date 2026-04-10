import { type StoredQueryCollection, type StoredQueryCollectionMeta } from "@/model/query";
import client from "@/api/client";
import { STORED_QUERY, SAVED_QUERY_COLLECTIONS } from "@/api/endpoints";

const collections: Record<string, StoredQueryCollection> = {};

export async function getQueryCollection(collectionId: string): Promise<StoredQueryCollection | null> {
  if (!collections[collectionId]) {
    try {
      const response = await client.get<StoredQueryCollection>(STORED_QUERY(collectionId));
      collections[collectionId] = response.data;
    } catch (e) {
      console.error(`Failed to get query collection: ${e}`);
      return null;
    }
  }
  return collections[collectionId];
}

export async function saveQueryCollection(collection: StoredQueryCollection): Promise<StoredQueryCollection> {
  try {
    console.log(`Saving queries to collection: ${collection.id}`);
    const response = await client.put<StoredQueryCollection>(STORED_QUERY(collection.id), collection);

    // update the local cache - merge response with original collection to preserve id
    // in case backend returns empty or partial response
    const savedData = {
      ...collection,
      ...(response.data && Object.keys(response.data).length > 0 ? response.data : {}),
    };
    collections[collection.id] = savedData;
    return collections[collection.id];
  } catch (e) {
    throw new Error(`Error saving queries to collection: ${collection.id}: ${e}`);
  }
}

export async function deleteQueryCollection(collectionId: string): Promise<void> {
  try {
    console.log(`Deleting queries in collection: ${collectionId}`);
    await client.delete(STORED_QUERY(collectionId));

    // update the local cache
    delete collections[collectionId];
  } catch (e) {
    throw new Error(`Error deleting queries in collection: ${collectionId}: ${e}`);
  }
}

export async function listQueryCollections(): Promise<StoredQueryCollectionMeta[]> {
  try {
    console.log(`Listing saved query collections`);
    const response = await client.get<StoredQueryCollectionMeta[]>(SAVED_QUERY_COLLECTIONS);
    console.log(`Found collections`, response.data);
    return response.data;
  } catch (e) {
    console.error(`Failed to list saved queries: ${e}`);
    return [];
  }
}

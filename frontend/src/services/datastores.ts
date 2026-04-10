import client from "@/api/client";
import {
  ADMIN_DATASTORES,
  ADMIN_DATASTORE_EXISTS,
  ADMIN_DATASTORE_COUNT,
  ADMIN_DATASTORE_EMPTY,
} from "@/api/endpoints";

export interface ListCollectionsResponse {
  collections: string[];
}

export interface CollectionExistsResponse {
  name: string;
  exists: boolean;
}

export interface CollectionCountResponse {
  name: string;
  count: number;
}

export async function listCollections(): Promise<string[]> {
  try {
    const response = await client.get<ListCollectionsResponse>(ADMIN_DATASTORES);
    return response.data.collections;
  } catch (error) {
    console.error("Failed to list datastore collections:", error);
    throw error;
  }
}

export async function checkCollectionExists(name: string): Promise<boolean> {
  try {
    const response = await client.get<CollectionExistsResponse>(ADMIN_DATASTORE_EXISTS, {
      params: { name },
    });
    return response.data.exists;
  } catch (error) {
    console.error(`Failed to check existence of collection '${name}':`, error);
    throw error;
  }
}

export async function countCollectionItems(name: string): Promise<number> {
  try {
    const response = await client.get<CollectionCountResponse>(ADMIN_DATASTORE_COUNT, {
      params: { name },
    });
    return response.data.count;
  } catch (error) {
    console.error(`Failed to count items in collection '${name}':`, error);
    throw error;
  }
}

export async function emptyCollection(name: string): Promise<void> {
  try {
    await client.post(ADMIN_DATASTORE_EMPTY, { name });
  } catch (error) {
    console.error(`Failed to empty collection '${name}':`, error);
    throw error;
  }
}

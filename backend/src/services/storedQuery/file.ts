import { StoredQueryCollection, StoredQueryCollectionMeta } from "../../model/query";
import { StoredQueryService } from "./storedQueryService";
import path from "path";
import { getConfigDirs, readConfig } from "../../config/config";
import fs, { writeFile } from "fs/promises";
import { logger, verbose } from "../../utils/logger/logger";
import { getEnvConfigItem } from "../../config/sources/source";

export const getFileStoredQueryService = (): StoredQueryService => new FileStoredQueryService();

export class FileStoredQueryService implements StoredQueryService {
  loadDirs: string[];
  storageDir: string;

  constructor() {
    const configDirs = getConfigDirs();
    this.loadDirs = configDirs;
    this.storageDir = getStoredQueryDir(configDirs);
  }

  async listCollections(): Promise<StoredQueryCollectionMeta[]> {
    const collections: StoredQueryCollectionMeta[] = [];

    for (const dir of this.loadDirs) {
      const files = await fs.readdir(dir);
      const collectionIds = files
        .filter((file) => {
          return file.startsWith("queries-") && file.endsWith(".json");
        })
        .map((file) => {
          return file.substring(8, file.length - 5);
        });

      const cols = await Promise.all(
        collectionIds.map(async (collectionId) => {
          const collection = await this.loadCollection(collectionId);
          return <StoredQueryCollectionMeta>{
            id: collection.id,
            title: collection.title,
          };
        }),
      );
      collections.push(...cols);
    }

    verbose(`Found ${collections.length} collections`, collections);
    return collections;
  }

  async loadCollection(collectionId: string): Promise<StoredQueryCollection | null> {
    logger(`Loading queries for collection: ${collectionId} from ${this.loadDirs}`);
    return readConfig<StoredQueryCollection>(
      this.loadDirs,
      buildQueryFilePrefix(collectionId),
      { required: false, resolveSecrets: false },
      null,
    );
  }

  async storeCollection(collection: StoredQueryCollection): Promise<void> {
    const queryFile = path.join(this.storageDir, buildQueryFilePrefix(collection.id) + ".json");
    logger(`Saving queries for collection: ${collection.id} to ${queryFile}`);
    try {
      await writeFile(queryFile, JSON.stringify(collection, null, 2));
    } catch (e) {
      throw new Error(`Failed to write query file: ${queryFile}: ${e}`);
    }
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const queryFile = path.join(this.storageDir, buildQueryFilePrefix(collectionId) + ".json");
    logger(`Deleting queries for collection: ${collectionId} from ${queryFile}`);
    try {
      await fs.unlink(queryFile);
    } catch (e) {
      throw new Error(`Failed to delete query file: ${queryFile}: ${e}`);
    }
  }

  overrideDirs(dirs: string[]) {
    this.loadDirs = dirs;
    this.storageDir = getStoredQueryDir(dirs);
  }
}

const getStoredQueryDir = (configDirs: string[]): string => {
  const STORED_QUERY_DIR = getEnvConfigItem("STORED_QUERY_DIR");
  if (!STORED_QUERY_DIR) {
    // take last, giving precedence to the last directory
    return configDirs[configDirs.length - 1];
  }
  return STORED_QUERY_DIR;
};

const buildQueryFilePrefix = (collection: string): string => `queries-${collection}`;

import {
  BaseDatastoreConfig,
  Datastore,
  DatastoreAdmin,
  DatastoreCollection,
  DatastoreConfig,
  DO_NOT_EXPIRE,
  QueryFilter,
} from "./api";
import { InMemoryDatastore } from "./inmem/db";
import { inMemoryAdmin } from "./inmem/db";
import { initMongoDb, MongoDatastore } from "./mongo/db";
import { mongoAdmin } from "./mongo/db";
import { logger, verbose } from "../utils/logger/logger";
import { DynamoDatastore, initDynamoDB } from "./dynamodb/db";
import { dynamoAdmin } from "./dynamodb/db";
import { initNeDB, NeDBDatastore } from "./nedb/db";
import { nedbAdmin } from "./nedb/db";
import { getEnvConfigItemAsBoolean, getEnvConfigItem } from "../config/sources/source";

const isAutoCreateEnabled = () => getEnvConfigItemAsBoolean("DATASTORE_AUTO_CREATE", true);

export type DatastoreFactory = (config: DatastoreConfig) => Datastore<any, any>;

const isCacheEnabled = () => getEnvConfigItemAsBoolean("LOOKUP_CACHE_ENABLED");
export const IN_MEMORY_DATASTORE = "inmem";

const registered: Record<string, { init: () => Promise<void>; factory: DatastoreFactory; admin?: DatastoreAdmin }> = {};
let defaultFactoryName: string;

const impls: Record<string, Datastore<any, any>> = {};

export const registerDatastore = (
  name: string,
  init: () => Promise<void>,
  factory: DatastoreFactory,
  isDefault = false,
  admin?: DatastoreAdmin,
) => {
  registered[name] = { init, factory, admin };
  if (isDefault) {
    defaultFactoryName = name;
  }
};

export const initDatastore = async () => {
  logger(`Lookup cache ${isCacheEnabled() ? "enabled" : "disabled"}`);
  registerFactories();

  const { implName, impl } = getImplementation();
  logger(`Initialising ${implName} store`);
  await impl.init();
};

/**
 * Provide an instance of the configured datastore.
 */
export const provideDatastore = <F extends QueryFilter, C extends DatastoreCollection = DatastoreCollection>(
  storeId: string,
  config: Partial<BaseDatastoreConfig>,
): Datastore<F, C> => {
  let impl = impls[storeId];
  if (!impl) {
    impl = determineDatastore(config);
    impls[storeId] = impl;
  }
  return impl as any as Datastore<F, C>;
};

/**
 * Provide the {@link DatastoreAdmin} for the currently configured datastore implementation.
 * Returns `undefined` if the active implementation has no admin registered.
 */
export const provideDatastoreAdmin = (): DatastoreAdmin | undefined => {
  const { implName } = getImplementation();
  return registered[implName]?.admin;
};

const getImplementation = () => {
  let implName: string;
  if (isCacheEnabled()) {
    implName = getEnvConfigItem("DATASTORE_IMPL", defaultFactoryName);
  } else {
    implName = IN_MEMORY_DATASTORE;
  }

  const impl = registered[implName];
  if (!impl) {
    throw new Error(`Unsupported datastore implementation: ${implName}`);
  }
  verbose(`Using ${implName} datastore`);
  return { implName, impl };
};

const determineDatastore = (baseConfig: Partial<BaseDatastoreConfig>) => {
  const { implName, impl } = getImplementation();

  const config = buildConfig(baseConfig, implName, isCacheEnabled());
  verbose("Datastore config", config);
  return impl.factory(config);
};

const buildConfig = (
  baseConfig: Partial<BaseDatastoreConfig>,
  implName: string,
  cacheEnabled: boolean,
): DatastoreConfig => {
  const expireAfterSeconds = baseConfig.expireAfterSeconds ?? DO_NOT_EXPIRE;
  const ttlIfToday = baseConfig.ttlIfToday ?? DO_NOT_EXPIRE;
  return {
    ...baseConfig,
    implName,
    storeEnabled: baseConfig.persistentStore || cacheEnabled,
    expiryEnabled: expireAfterSeconds != DO_NOT_EXPIRE || ttlIfToday != DO_NOT_EXPIRE,
    autoCreate: isAutoCreateEnabled(),
    expireAfterSeconds,
    ttlIfToday,
  };
};

const registerFactories = () => {
  registerDatastore(
    IN_MEMORY_DATASTORE,
    () => Promise.resolve(),
    (config) => new InMemoryDatastore(config),
    true,
    inMemoryAdmin,
  );
  registerDatastore(
    "localdb",
    async () => {
      await initNeDB();
    },
    (config) => new NeDBDatastore(config),
    false,
    nedbAdmin,
  );
  registerDatastore(
    "dynamodb",
    async () => {
      await initDynamoDB();
    },
    (config) => new DynamoDatastore(config),
    false,
    dynamoAdmin,
  );
  registerDatastore(
    "mongodb",
    async () => {
      await initMongoDb();
    },
    (config) => new MongoDatastore(config),
    false,
    mongoAdmin,
  );
};

import {
  BatchWriteItemCommand,
  CreateTableCommand,
  DeleteItemCommand,
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  TimeToLiveStatus,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";
import { AbstractDatastore, DatastoreCollection, EXPIRY_FIELD, QueryFilter } from "../api";
import { error, logger, verbose } from "../../utils/logger/logger";
import { AttributeValue } from "@aws-sdk/client-dynamodb/dist-types/models/models_0";
import { sleep } from "../../utils/math";
import { convertFromDdbMap, convertToDdbMap } from "./converter";

/**
 * DynamoDB datastore.
 *
 * This datastore implementation holds items in an external DynamoDB
 * table. It requires configuration of the connection and
 * authentication details for the DynamoDB table.
 */

/**
 * The default prefix for the table name.
 */
const DEFAULT_TABLE_PREFIX = "CodeMetrics";

type DatabaseConfig = {
  tablePrefix: string;
};

let config: DatabaseConfig;
let client: DynamoDBClient;

/**
 * Invoke once.
 */
export const initDynamoDB = async () => {
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION must be set");
  }
  let tablePrefix = process.env.DATABASE_NAME;
  if (!tablePrefix) {
    logger(`Using default table prefix: ${DEFAULT_TABLE_PREFIX}`);
    tablePrefix = DEFAULT_TABLE_PREFIX;
  }
  config = {
    tablePrefix,
  };
  client = new DynamoDBClient({ region });
};

type CacheKey = {
  CacheKey: AttributeValue.SMember;
};

type CacheEntry = CacheKey & {
  CacheValue: AttributeValue.MMember;
};

class DynamoTable implements DatastoreCollection {
  private readonly client: DynamoDBClient;
  readonly tableName: string;

  constructor(client: DynamoDBClient, tableName: string) {
    this.client = client;
    this.tableName = tableName;
  }

  findOne = async (filter: QueryFilter) => {
    const key: CacheKey = {
      CacheKey: {
        S: JSON.stringify(filter),
      },
    };
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: key,
    });
    try {
      const response = await this.client.send(command);
      const ddbItem = response.Item as CacheEntry;
      if (ddbItem?.CacheValue?.M) {
        return convertFromDdbMap(ddbItem.CacheValue.M);
      }
      return null;
    } catch (e) {
      if (e.name === "ResourceNotFoundException") {
        return null;
      }
      throw e;
    }
  };

  insertOne = async (key: QueryFilter, item) => {
    const ddbItem = {
      CacheKey: {
        S: JSON.stringify(key),
      },
      ...convertToDdbMap({ CacheValue: item }),
    };

    const expiresAt = item[EXPIRY_FIELD];
    if (expiresAt && expiresAt instanceof Date) {
      // The expiry field on the DynamoDB item is the functional expiration field.
      // The expiry timestamp serialised in the item value is ignored.
      // Note: DynamoDB requires the TTL field to be in Unix epoch seconds,
      // but passed as a string.
      ddbItem[EXPIRY_FIELD] = {
        N: Math.floor(expiresAt.getTime() / 1000).toString(),
      };
    }

    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: ddbItem,
    });
    try {
      await this.client.send(command);
    } catch (e) {
      if (e.name === "ResourceNotFoundException") {
        return null;
      }
      throw e;
    }
  };

  deleteOne = async (itemKey: QueryFilter) => {
    const key: CacheKey = {
      CacheKey: {
        S: JSON.stringify(itemKey),
      },
    };
    const command = new DeleteItemCommand({
      TableName: this.tableName,
      Key: key,
    });
    try {
      await this.client.send(command);
    } catch (e) {
      if (e.name === "ResourceNotFoundException") {
        verbose(`Could not delete item ${JSON.stringify(itemKey)} from table ${this.tableName} as it does not exist`);
      } else {
        throw e;
      }
    }
  };

  listItems = async () => {
    const command = new ScanCommand({
      TableName: this.tableName,
    });
    try {
      const response = await this.client.send(command);
      return response.Items.map((item : CacheEntry) => {
        return convertFromDdbMap(item.CacheValue.M);
      });
    } catch (e) {
      if (e.name === "ResourceNotFoundException") {
        return [];
      }
      throw e;
    }
  };

  deleteAll = async () => {
    const command = new BatchWriteItemCommand({
      RequestItems: {
        [this.tableName]: [
          {
            DeleteRequest: {
              Key: {
                CacheKey: {
                  S: ".*",
                }
              }
            }
          }
        ]
      }
    });

    try {
      await this.client.send(command);
    } catch (e) {
      if (e.name === "ResourceNotFoundException") {
        verbose(`Could not delete all items from table ${this.tableName} as it does not exist`);
      } else {
        throw e;
      }
    }
  }
}

export class DynamoDatastore extends AbstractDatastore<QueryFilter, DynamoTable> {
  connect = async <T>(rawTableName: string, operation: (table: DynamoTable) => Promise<T>): Promise<T> => {
    const tableName = `${config.tablePrefix}_${rawTableName}`;
    try {
      let justCreated = false;
      if (!(await this.doesTableExist(client, tableName))) {
        logger(`Creating table: ${tableName}`);
        try {
          await this.createTable(client, tableName);
        } catch (e) {
          // check if the table already exists, to avoid a race
          if (!(await this.doesTableExist(client, tableName))) {
            throw new Error(`Failed to create table ${tableName}: ${e}`);
          }
        }
        justCreated = true;
      }
      await this.waitForActiveTable(client, tableName);
      const table = new DynamoTable(client, tableName);
      if (justCreated && this.config.expiryEnabled) {
        await this.configureExpiration(table);
      }
      return await operation(table);
    } catch (e) {
      error(`Datastore operation failed on '${tableName}'`, e);
      throw e;
    }
  };

  private doesTableExist = async (client: DynamoDBClient, tableName: string): Promise<boolean> => {
    const command = new DescribeTableCommand({
      TableName: tableName,
    });
    try {
      const response = await client.send(command);
      return response.Table?.TableName === tableName;
    } catch (e) {
      if (e.name === "ResourceNotFoundException") {
        return false;
      }
      throw e;
    }
  };

  private createTable = async (client: DynamoDBClient, tableName: string) => {
    const command = new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [
        {
          AttributeName: "CacheKey",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "CacheKey",
          KeyType: "HASH",
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    });
    try {
      await client.send(command);
    } catch (e) {
      throw new Error(`Failed to create table ${tableName}: ${e}`);
    }
  };

  private waitForActiveTable = async (client: DynamoDBClient, tableName: string) => {
    const attempts = 10;
    let attempt = 0;
    while (++attempt <= attempts) {
      logger(`Waiting for table ${tableName} to become active (attempt: ${attempt})...`);
      if (await this.isTableActive(client, tableName)) {
        return;
      }
      await sleep(1000);
    }
    throw new Error(`Table ${tableName} did not become active`);
  };

  private isTableActive = async (client: DynamoDBClient, tableName: string): Promise<boolean> => {
    const command = new DescribeTableCommand({
      TableName: tableName,
    });
    const response = await client.send(command);
    return response.Table?.TableStatus === "ACTIVE";
  };

  /**
   * Ensure TTL is enabled for the table.
   * See https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-how-to.html
   * @param table
   */
  private configureExpiration = async (table: DynamoTable) => {
    const descCommand = new DescribeTimeToLiveCommand({
      TableName: table.tableName,
    });
    const descResponse = await client.send(descCommand);
    const ttlStatus = descResponse.TimeToLiveDescription?.TimeToLiveStatus;
    if (ttlStatus === TimeToLiveStatus.ENABLED || ttlStatus === TimeToLiveStatus.ENABLING) {
      verbose(`TTL already enabled for table: ${table.tableName}`);
      return;
    }

    logger(`Enabling TTL for table: ${table.tableName}`);
    const updateCommand = new UpdateTimeToLiveCommand({
      TableName: table.tableName,
      TimeToLiveSpecification: {
        Enabled: true,
        AttributeName: EXPIRY_FIELD,
      },
    });
    await client.send(updateCommand);
    logger(`Enabled TTL for table: ${table.tableName}`);
  };
}

import { logger, verbose, warn } from "../utils/logger/logger";
import { provideDatastore } from "../db/factory";
import { Principal } from "./auth";
import { generateToken, SecurityTokens, TokenPayload } from "./tokens";
import { Datastore, DatastoreCollection } from "../db/api";
import { getEnvConfigItem } from "../config/sources/source";

const serviceTokenTtl = getEnvConfigItem("SERVICE_TOKEN_TTL", "1y");

const TOKENID_COLLECTION_NAME = "token_ids";

type TokenIdRecord = {
  /**
   * The ID (`jti`) of the JWT.
   */
  tokenId: string;

  /**
   * The creation time of the token.
   */
  created: Date;

  /**
   * The subject of the token.
   */
  sub: string;

  /**
   * Expiry date of the token.
   */
  expires: Date;

  /**
   * Subject who generated the token.
   */
  createdBy: string;
};

let longLivedTokenStore: Datastore<TokenIdRecord, DatastoreCollection> | undefined;

const usingLongLivedTokenStore = async <T>(callback: (collection: DatastoreCollection) => T) => {
  if (!longLivedTokenStore) {
    longLivedTokenStore = provideDatastore("servicetokens", { persistentStore: true });
  }
  return await longLivedTokenStore.connect(TOKENID_COLLECTION_NAME, async (collection) => {
    return callback(collection);
  });
};

/**
 * Generates a long-lived access token for the user.
 * @param subject the subject of the token
 * @param user the user who is generating the token
 */
export const generateLongLivedAccessToken = async (
  subject: string,
  user: Principal,
): Promise<SecurityTokens | null> => {
  if (user?.name?.length && subject?.length) {
    try {
      logger(`Generating long-lived access token for user: ${user.name}`);
      const longLivedAccessToken = generateToken(user.name, "long_lived_access_token", serviceTokenTtl);

      await usingLongLivedTokenStore(async (collection) => {
        const key = { tokenId: longLivedAccessToken.tokenId };
        const tokenIdRecord: TokenIdRecord = {
          ...key,
          created: longLivedAccessToken.created,
          expires: longLivedAccessToken.expires,
          sub: subject,
          createdBy: user.name,
        };
        await collection.insertOne(key, tokenIdRecord);
      });

      logger(`Long-lived access token generated for user: ${user.name} with ID ${longLivedAccessToken.tokenId}`);
      return {
        accessToken: longLivedAccessToken.token,
        refreshToken: "", // Long-lived tokens do not have a refresh token
      };
    } catch (e) {
      throw new Error(`Failed to generate long-lived access token: ${e.message}`);
    }
  } else {
    throw new Error("Cannot generate long-lived access token without user or subject");
  }
};

/**
 * Validates a long-lived access token by checking its JWT ID (jti) against the database.
 * @param jwt
 * @param callback
 */
export const validateLongLivedAccessToken = (
  jwt: TokenPayload,
  callback: (valid: boolean, sub?: string, roles?: string[]) => void,
) => {
  const tokenId = jwt.jti;
  if (!tokenId) {
    warn("Long-lived access token is missing JWT ID (jti)");
    callback(false);
    return;
  }

  usingLongLivedTokenStore(async (collection) => {
    const dbToken = await collection.findOne({ tokenId });
    const tokenIdFound = dbToken?.tokenId === tokenId;
    verbose(`Checking long-lived access token with ID ${tokenId} in database: ${tokenIdFound ? "found" : "not found"}`);
    return tokenIdFound;
  })
    .then((tokenIdFound) => {
      if (tokenIdFound) {
        verbose(`Long-lived access token with ID ${tokenId} is valid`);
        callback(true, jwt.sub, jwt.roles);
      } else {
        warn(`Invalid long-lived access token ID: ${tokenId}`);
        callback(false);
      }
    })
    .catch((err) => {
      warn(`Error validating long-lived access token with ID: ${tokenId}:`, err);
      callback(false);
    });
};

export const listLongLivedAccessTokenIds = async (): Promise<TokenIdRecord[]> => {
  try {
    return await usingLongLivedTokenStore(async (collection) => {
      return (await collection.listItems()) as TokenIdRecord[];
    });
  } catch (e) {
    throw new Error(`Failed to list long-lived access token IDs: ${e.message}`);
  }
};

/**
 * Revokes a long-lived access token by removing its ID from the database.
 * @param tokenId
 */
export const revokeLongLivedAccessToken = async (tokenId: string): Promise<boolean> => {
  if (!tokenId) {
    throw new Error("Token ID is required to revoke a long-lived access token");
  }
  try {
    const deleted = await usingLongLivedTokenStore(async (collection) => {
      return await collection.deleteOne({ tokenId });
    });
    if (deleted) {
      logger(`Long-lived access token with ID ${tokenId} revoked successfully`);
      return true;
    } else {
      warn(`No long-lived access token found with ID: ${tokenId}`);
      return false;
    }
  } catch (e) {
    throw new Error(`Failed to revoke long-lived access token with ID: ${tokenId}: ${e.message}`);
  }
};

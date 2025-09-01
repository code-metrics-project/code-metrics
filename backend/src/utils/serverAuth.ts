import { OAuthConfig, RemoteServer, RemoteServerCategory, RemoteServerType } from "../model/config/remote-config";
import { verbose } from "./logger/logger";
import { provideDatastore } from "../db/factory";
import { Datastore, DatastoreCollection } from "../db/api";
import { decrypt, encrypt } from "./cryptoutil";
import { getTokenSecret } from "../auth/tokens";

export type ServerAuth = {
  getApiKey(): Promise<string | null>;
};

export const buildServerAuth = (
  serverCategory: RemoteServerCategory,
  serverType: RemoteServerType,
  server: RemoteServer | (RemoteServer & OAuthConfig),
): ServerAuth => {
  if ((server as OAuthConfig).refreshToken) {
    verbose(`server uses OAuth with refresh token`, server);
    const oauthServer = server as RemoteServer & OAuthConfig;
    return new OAuthServerAuth(serverCategory, serverType, oauthServer);
  } else {
    verbose(`server uses API key`, server);
    const apiKeyServer = server as RemoteServer;
    return {
      getApiKey: () => Promise.resolve(apiKeyServer.apiKey),
    };
  }
};

enum StoredTokenType {
  ACCESS_TOKEN,
  REFRESH_TOKEN,
}

type TokenFilter = {
  cacheId: string;
};

type TokenDetails = {
  tokenType: StoredTokenType;
  encryptedToken: string;
}

type TokensWrapper = TokenFilter & {
  /**
   * Encrypted access token details.
   */
  accessToken: TokenDetails & {
    tokenExpiry: number;
  };

  /**
   * Encrypted refresh token details.
   * Note: not all OAuth servers will use a refresh token.
   */
  refreshToken?: TokenDetails;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
};

/**
 * ServerAuth implementation that uses OAuth to obtain an access token
 * using a refresh token.
 */
class OAuthServerAuth implements ServerAuth {
  private serverCategory: RemoteServerCategory;
  private serverType: RemoteServerType;
  private readonly server: RemoteServer & OAuthConfig;
  private readonly tokenStore: Datastore<TokenFilter, DatastoreCollection>;

  constructor(serverCategory: RemoteServerCategory, serverType: RemoteServerType, server: RemoteServer & OAuthConfig) {
    if (!server.tokenUrl) {
      throw new Error(`Missing token URL for OAuth server ${server.id}`);
    } else if (!server.refreshToken) {
      throw new Error(`Missing refresh token for OAuth server ${server.id}`);
    }

    this.serverCategory = serverCategory;
    this.serverType = serverType;
    this.server = server;
    this.tokenStore = provideDatastore(`oauth`, {
      persistentStore: true,
    });
  }

  async getApiKey(): Promise<string | null> {
    const cacheId = `${this.serverCategory}:${this.serverType}:${this.server.id}`;
    const filter: TokenFilter = { cacheId };

    const tokenWrapper = await this.tokenStore.findOrInsertOne(
      "tokens",
      filter,
      async (old: TokensWrapper) => {
        // use the refresh token from the cache if available, otherwise use the original refresh token
        const refreshToken = old?.refreshToken ? this.decryptToken(old.refreshToken.encryptedToken) : this.server.refreshToken;
        return this.obtainTokens(cacheId, refreshToken);
      },
      (cached) => {
        // check if the token has expired
        return cached && Date.now() < cached.accessToken.tokenExpiry;
      },
    );

    // decrypt the token before returning it
    return this.decryptToken(tokenWrapper.accessToken.encryptedToken);
  }

  async obtainTokens(cacheId: string, refreshToken: string): Promise<TokensWrapper> {
    try {
      verbose(`Obtaining tokens from ${cacheId}`);

      const body = new URLSearchParams();
      body.append("grant_type", "refresh_token");
      body.append("client_id", this.server.clientId);
      body.append("client_secret", this.server.clientSecret);
      body.append("refresh_token", refreshToken);

      const wrapper: TokensWrapper = await fetch(this.server.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }).then(async (response): Promise<TokensWrapper> => {
        if (!response.ok) {
          throw new Error(`Failed to obtain tokens from ${cacheId}: ${response.status} ${response.statusText}`);
        }
        const tokenResponse = (await response.json()) as TokenResponse;

        // calculate the expiry time
        const tokenExpiry = Date.now() + tokenResponse.expires_in * 1000;

        const encryptedAccessToken = {
          tokenType: StoredTokenType.ACCESS_TOKEN,
          encryptedToken: this.encryptToken(tokenResponse.access_token),
          tokenExpiry,
        };

        const encryptedRefreshToken = tokenResponse.refresh_token ? {
          tokenType: StoredTokenType.REFRESH_TOKEN,
          encryptedToken: this.encryptToken(tokenResponse.refresh_token),
        } : undefined;

        return {
          cacheId,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
        };
      });

      verbose(`Obtained tokens from ${cacheId}, with expiry at ${wrapper.accessToken.tokenExpiry}`);
      return wrapper;
    } catch (e) {
      throw new Error(`Failed to obtain tokens from ${cacheId}: ${e}`);
    }
  }

  private encryptToken(cleartext: string): string {
    const passphrase = getTokenSecret();
    return encrypt(passphrase, this.server.id, cleartext);
  }

  private decryptToken(ciphertext: string): string {
    const passphrase = getTokenSecret();
    return decrypt(passphrase, this.server.id, ciphertext);
  }
}

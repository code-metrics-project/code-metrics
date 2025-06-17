import {OAuthConfig, RemoteServer} from "../model/config/remote-config";
import {verbose} from "./logger/logger";
import {provideDatastore} from "../db/factory";
import {Datastore, DatastoreCollection} from "../db/api";
import {decrypt, encrypt} from "./cryptoutil";
import {getAccessTokenSecret} from "../auth/auth";

export type ServerAuth = {
  getApiKey(): Promise<string | null>;
}

export const buildServerAuth = (
    server: RemoteServer | (RemoteServer & OAuthConfig)
): ServerAuth => {
    if ((server as OAuthConfig).refreshToken) {
        verbose(`sever uses OAuth with refresh token`, server);
        const oauthServer = server as RemoteServer & OAuthConfig;
        return new OAuthServerAuth(oauthServer);
    } else {
        verbose(`sever uses API key`, server);
        const apiKeyServer = server as RemoteServer;
        return {
            getApiKey: () => Promise.resolve(apiKeyServer.apiKey),
        }
    }
};

enum StoredTokenType {
    ACCESS_TOKEN,
    REFRESH_TOKEN,
}

type TokenFilter = {
    serverId: string;
    tokenType: StoredTokenType;
}

type TokenWrapper = TokenFilter & {
    tokenExpiry: number;
    encryptedToken: string;
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
    private readonly server: RemoteServer & OAuthConfig;
    private readonly tokenStore: Datastore<TokenFilter, DatastoreCollection>;

    constructor(server: RemoteServer & OAuthConfig) {
        if (!server.tokenUrl) {
            throw new Error(`Missing token URL for OAuth server ${server.id}`);
        } else if (!server.refreshToken) {
            throw new Error(`Missing refresh token for OAuth server ${server.id}`);
        }

        this.server = server;
        this.tokenStore = provideDatastore(`oauth-${server.id}`, {
            /**
             * Cache tokens for 10 minutes.
             */
            expireAfterSeconds: 10 * 60,
        });
    }

    async getApiKey(): Promise<string | null> {
        const filter: TokenFilter = { tokenType: StoredTokenType.ACCESS_TOKEN, serverId: this.server.id };

        const tokenWrapper = await this.tokenStore.findOrInsertOne("tokens", filter, async () => {
            return this.obtainAccessToken();
        }, (cached) => {
            // check if the token has expired
            return cached && Date.now() < cached.tokenExpiry;
        });

        // decrypt the token before returning it
        return this.decryptToken(tokenWrapper.encryptedToken);
    }

    async obtainAccessToken(): Promise<TokenWrapper> {
        try {
            verbose(`Obtaining access token for server ${this.server.id}`);

            const body = new URLSearchParams();
            body.append("grant_type", "refresh_token");
            body.append("client_id", this.server.clientId);
            body.append("client_secret", this.server.clientSecret);
            body.append("refresh_token", this.server.refreshToken);

            const tokenWrapper: TokenWrapper = await fetch(this.server.tokenUrl, {
                method: "POST",
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                body: body.toString(),
            }).then(async (response): Promise<TokenWrapper> => {
                if (!response.ok) {
                    throw new Error(`Failed to obtain access token: ${response.status} ${response.statusText}`);
                }
                const tokenResponse = await response.json() as TokenResponse;

                // calculate the expiry time
                const tokenExpiry = Date.now() + (tokenResponse.expires_in * 1000);

                // encrypt the token before storing it
                const encryptedToken = this.encryptToken(tokenResponse.access_token);

                // TODO don't ignore new refresh token - store it

                return {
                    tokenType: StoredTokenType.ACCESS_TOKEN,
                    serverId: this.server.id,
                    tokenExpiry,
                    encryptedToken,
                };
            });

            verbose(`Obtained access token for server ${this.server.id}, with expiry at ${tokenWrapper.tokenExpiry}`);
            return tokenWrapper;

        } catch (e) {
            throw new Error(`Failed to obtain access token: ${e}`);
        }
    }

    private encryptToken(cleartext: string): string {
        const passphrase = getAccessTokenSecret();
        return encrypt(passphrase, this.server.id, cleartext);
    }

    private decryptToken(ciphertext: string): string {
        const passphrase = getAccessTokenSecret();
        return decrypt(passphrase, this.server.id, ciphertext);
    }
}

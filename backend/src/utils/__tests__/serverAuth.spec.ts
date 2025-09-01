import { buildServerAuth } from "../serverAuth";
import { OAuthConfig, RemoteServer } from "../../model/config/remote-config";
import { initDatastore, provideDatastore } from "../../db/factory";
import { createServer, Server } from "http";

jest.mock("../cryptoutil", () => ({
  encrypt: jest.fn((passphrase, serverId, cleartext) => `encrypted-${cleartext}`),
  decrypt: jest.fn((passphrase, serverId, ciphertext) => ciphertext.replace("encrypted-", "")),
}));
jest.mock("../../auth/tokens", () => ({
  getTokenSecret: jest.fn(() => "test-secret"),
}));

let tokenServer: Server;
let tokenServerUrl: string;

beforeAll(async () => {
  process.env["LOOKUP_CACHE_ENABLED"] = "true";
  await initDatastore();

  // Start a simple HTTP server to act as the token endpoint
  tokenServer = createServer((req, res) => {
    if (req.method === "POST" && req.url === "/token") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          access_token: "test-access-token",
          expires_in: 3600,
          refresh_token: "new-refresh-token",
          scope: "read",
          token_type: "Bearer",
        }),
      );
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise<void>((resolve) => {
    tokenServer.listen(0, () => {
      const address = tokenServer.address();
      if (address && typeof address === "object") {
        tokenServerUrl = `http://localhost:${address.port}`;
      }
      resolve();
    });
  });
});

afterAll(() => {
  process.env["LOOKUP_CACHE_ENABLED"] = "false";
  tokenServer.close();
});

describe("buildServerAuth", () => {
  it("should return API key-based ServerAuth when no OAuth config is provided", async () => {
    const server: RemoteServer = {
      id: "server1",
      apiKey: "test-api-key",
    };

    const serverAuth = buildServerAuth("ticketManagement", "servicenow", server);
    const apiKey = await serverAuth.getApiKey();

    expect(apiKey).toBe("test-api-key");
  });

  it("should return OAuth-based ServerAuth when OAuth config is provided", async () => {
    const server: RemoteServer & OAuthConfig = {
      id: "server2",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      refreshToken: "test-refresh-token",
      tokenUrl: `${tokenServerUrl}/token`,
    };

    const serverAuth = buildServerAuth("ticketManagement", "servicenow", server);
    const apiKey = await serverAuth.getApiKey();

    expect(apiKey).toBe("test-access-token");
  });
});

describe("OAuthServerAuth", () => {
  it("should obtain and cache an access token", async () => {
    const server: RemoteServer & OAuthConfig = {
      id: "server3",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      refreshToken: "test-refresh-token",
      tokenUrl: `${tokenServerUrl}/token`,
    };

    const serverAuth = buildServerAuth("ticketManagement", "servicenow", server);
    const apiKey = await serverAuth.getApiKey();

    expect(apiKey).toBe("test-access-token");

    const cacheId = `ticketManagement:servicenow:${server.id}`;

    // Query the datastore to verify the access token was cached
    const datastore = provideDatastore(`oauth`, { expireAfterSeconds: 10 * 60 });
    const cachedToken = await datastore.connect("tokens", async (col) => {
      return col.findOne({ cacheId });
    });
    expect(cachedToken).not.toBeNull();
    expect(cachedToken?.accessToken?.encryptedToken).toBe("encrypted-test-access-token");
    expect(cachedToken?.accessToken?.tokenType).toBe(0);
    expect(cachedToken?.accessToken?.tokenExpiry).toBeGreaterThan(Date.now());
    expect(cachedToken?.refreshToken?.encryptedToken).toBe("encrypted-new-refresh-token");
    expect(cachedToken?.refreshToken?.tokenType).toBe(1);
  });
});

import {
  buildPhysicalResourceId,
  handler,
  parseUrlList,
  sendWithRetry,
  urlListsMatch,
} from "../authWiring/src/index";
import {
  __failNextSends,
  __getClient,
  __reset,
  __sentCommands,
  __setClient,
} from "./mocks/cognitoIdentityProvider.mock";

const accessDeniedError = (): Error => {
  const error = new Error("not authorized");
  error.name = "AccessDeniedException";
  return error;
};

const CALLBACK_URL = "https://d1b0uhy3s30pui.cloudfront.net/login/callback";
const LOGOUT_URL = "https://d1b0uhy3s30pui.cloudfront.net/logout";

describe("authWiring parseUrlList", () => {
  it("treats missing values and CloudFormation remove markers as an empty list", () => {
    expect(parseUrlList(undefined)).toEqual([]);
    expect(parseUrlList(null)).toEqual([]);
    expect(parseUrlList("")).toEqual([]);
    expect(parseUrlList("   ")).toEqual([]);
    expect(parseUrlList("REMOVE")).toEqual([]);
    expect(parseUrlList("AWS::NoValue")).toEqual([]);
  });

  it("parses JSON array strings and deduplicates, trims and sorts values", () => {
    expect(parseUrlList(`["https://b.example/logout", "https://a.example/home", "https://b.example/logout" ]`)).toEqual([
      "https://a.example/home",
      "https://b.example/logout",
    ]);
  });

  it("accepts an already-parsed array", () => {
    expect(parseUrlList(["https://b.example", "https://a.example"])).toEqual(["https://a.example", "https://b.example"]);
  });

  it("accepts a comma separated string and ignores empty entries", () => {
    expect(parseUrlList("https://b.example, , https://a.example")).toEqual(["https://a.example", "https://b.example"]);
  });

  it("rejects non-https URLs", () => {
    expect(() => parseUrlList('["http://insecure.example/home"]')).toThrow(/must use https:\/\//);
    expect(() => parseUrlList("ftp://insecure.example")).toThrow(/must use https:\/\//);
  });

  it("rejects malformed JSON array strings", () => {
    expect(() => parseUrlList('["https://a.example, unterminated"')).toThrow(/JSON array string/);
  });

  it("rejects unsupported value types", () => {
    expect(() => parseUrlList(42)).toThrow(/Unsupported/);
  });
});

describe("authWiring urlListsMatch", () => {
  it("matches lists that contain the same URLs in any order", () => {
    expect(urlListsMatch(["https://a", "https://b"], ["https://b", "https://a"])).toBe(true);
    expect(urlListsMatch([], [])).toBe(true);
  });

  it("does not match different URL sets", () => {
    expect(urlListsMatch(["https://a"], ["https://a", "https://b"])).toBe(false);
    expect(urlListsMatch(["https://a"], ["https://c"])).toBe(false);
    expect(urlListsMatch([], [""])).toBe(false);
  });
});

describe("authWiring buildPhysicalResourceId", () => {
  it("scopes the custom resource id to the pool and client", () => {
    expect(buildPhysicalResourceId("eu-west-2_pool", "client-123")).toBe("eu-west-2_pool:client-123");
  });
});

describe("authWiring handler", () => {
  beforeEach(() => {
    __reset();
  });

  const baseEvent = (requestType: string): { RequestType: string; ResourceProperties: Record<string, unknown> } => ({
    RequestType: requestType,
    ResourceProperties: {
      UserPoolId: "eu-west-2_pool",
      UserPoolClientId: "client-123",
      CallbackUrls: JSON.stringify([CALLBACK_URL]),
      LogoutUrls: JSON.stringify([LOGOUT_URL]),
    },
  });

  it("completes Delete without touching Cognito", async () => {
    const result = await handler({ ...baseEvent("Delete"), PhysicalResourceId: "eu-west-2_pool:client-123" });

    expect(result).toEqual({ Status: "SUCCESS", PhysicalResourceId: "eu-west-2_pool:client-123" });
    expect(__sentCommands()).toEqual([]);
  });

  it("skips the update when the client already has the desired URLs", async () => {
    __setClient("client-123", { CallbackURLs: [CALLBACK_URL], LogoutURLs: [LOGOUT_URL] });

    const result = await handler(baseEvent("Create"));

    expect(result).toEqual({ Status: "SUCCESS", PhysicalResourceId: "eu-west-2_pool:client-123" });
    expect(__sentCommands().map((command) => command.name)).toEqual(["DescribeUserPoolClient"]);
  });

  it("skips the update when the current URL order differs but contains the same URLs", async () => {
    const alternateCallback = "https://d1b0uhy3s30pui.cloudfront.net/alternate-callback";
    __setClient("client-123", {
      CallbackURLs: [alternateCallback, CALLBACK_URL],
      LogoutURLs: [LOGOUT_URL],
    });
    const event = baseEvent("Update");
    event.ResourceProperties = {
      ...event.ResourceProperties,
      CallbackUrls: JSON.stringify([CALLBACK_URL, alternateCallback]),
    };

    await handler(event);

    expect(__sentCommands().map((command) => command.name)).toEqual(["DescribeUserPoolClient"]);
  });

  it("updates both URL lists when the client does not match", async () => {
    __setClient("client-123", { CallbackURLs: ["https://myapp.com/home"], LogoutURLs: ["https://myapp.com/logout"] });

    const result = await handler(baseEvent("Create"));

    expect(result).toEqual({ Status: "SUCCESS", PhysicalResourceId: "eu-west-2_pool:client-123" });
    expect(__getClient("client-123")).toEqual({
      ClientId: "client-123",
      CallbackURLs: [CALLBACK_URL],
      LogoutURLs: [LOGOUT_URL],
    });

    const commands = __sentCommands();
    expect(commands.map((command) => command.name)).toEqual(["DescribeUserPoolClient", "UpdateUserPoolClient"]);
    expect(commands[1].input).toEqual({
      UserPoolId: "eu-west-2_pool",
      ClientId: "client-123",
      CallbackURLs: [CALLBACK_URL],
      LogoutURLs: [LOGOUT_URL],
      GenerateSecret: false,
    });
  });

  it("supports the array form of the URL list properties", async () => {
    __setClient("client-123", {});
    const event = baseEvent("Create");
    event.ResourceProperties = {
      ...event.ResourceProperties,
      CallbackUrls: [CALLBACK_URL],
      LogoutUrls: [LOGOUT_URL],
    };

    await handler(event);

    expect(__getClient("client-123")).toEqual({
      ClientId: "client-123",
      CallbackURLs: [CALLBACK_URL],
      LogoutURLs: [LOGOUT_URL],
    });
  });

  it("requires the user pool and client properties", async () => {
    await expect(handler({ RequestType: "Create", ResourceProperties: { UserPoolId: "pool" } })).rejects.toThrow(
      /required/,
    );
    await expect(handler({ RequestType: "Create", ResourceProperties: { UserPoolClientId: "client" } })).rejects.toThrow(
      /required/,
    );
  });

  it("fails when the Cognito client cannot be described", async () => {
    await expect(handler(baseEvent("Create"))).rejects.toThrow(/UserPoolClientNotFoundException/);
  });

  it("recovers when the first call hits a transient AccessDenied (IAM propagation)", async () => {
    __setClient("client-123", { CallbackURLs: [CALLBACK_URL], LogoutURLs: [LOGOUT_URL] });
    __failNextSends(1, accessDeniedError());

    const result = await handler(baseEvent("Create"));

    expect(result).toEqual({ Status: "SUCCESS", PhysicalResourceId: "eu-west-2_pool:client-123" });
    expect(__sentCommands().map((command) => command.name)).toEqual(["DescribeUserPoolClient"]);
  });

  it("fails when transient AccessDenied never clears", async () => {
    __setClient("client-123", {});
    __failNextSends(10, accessDeniedError());

    // Real backoff sleeps (2+4+8s) — allow for the full retry budget.
    await expect(handler(baseEvent("Create"))).rejects.toThrow(/not authorized/);
  }, 20000);

});

describe("authWiring sendWithRetry", () => {
  const fastOptions = { attempts: 4, baseDelayMs: 1 };

  it("returns the first successful response", async () => {
    const client = { send: jest.fn().mockResolvedValue({ ok: true }) };

    await expect(sendWithRetry(client, "cmd", fastOptions)).resolves.toEqual({ ok: true });
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it("retries retryable errors until the call succeeds", async () => {
    const client = {
      send: jest
        .fn()
        .mockRejectedValueOnce(accessDeniedError())
        .mockRejectedValueOnce(accessDeniedError())
        .mockResolvedValue({ ok: true }),
    };

    await expect(sendWithRetry(client, "cmd", fastOptions)).resolves.toEqual({ ok: true });
    expect(client.send).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable errors", async () => {
    const notFound = new Error("missing");
    notFound.name = "ResourceNotFoundException";
    const client = { send: jest.fn().mockRejectedValue(notFound) };

    await expect(sendWithRetry(client, "cmd", fastOptions)).rejects.toThrow(/missing/);
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it("throws the last error once attempts are exhausted", async () => {
    const client = { send: jest.fn().mockRejectedValue(accessDeniedError()) };

    await expect(sendWithRetry(client, "cmd", fastOptions)).rejects.toThrow(/not authorized/);
    expect(client.send).toHaveBeenCalledTimes(4);
  });
});

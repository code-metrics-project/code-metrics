describe("OIDC auth provider", () => {
  beforeEach(() => {
    delete process.env.OIDC_REDIRECT_URI;
    jest.resetModules();
  });

  it("should determine the redirect URI from the request", async () => {
    process.env.UI_BASE_URL = "https://anotherexample.com";
    const { testables } = await require("../oidc");

    const result = testables.determineRedirectUri();
    expect(result.toString()).toEqual("https://anotherexample.com/login/callback");
  });

  it("should determine the redirect URI from the environment variable", async () => {
    process.env.OIDC_REDIRECT_URI = "https://example.com/login/callback";
    const { testables } = await require("../oidc");

    const result = testables.determineRedirectUri();
    expect(result.toString()).toEqual("https://example.com/login/callback");
  });

  it("should allow insecure discovery requests for localhost OIDC issuers", async () => {
    const { testables } = await require("../oidc");
    const allowInsecureRequests = jest.fn();

    const result = testables.getDiscoveryExecuteHooks(new URL("http://localhost:8080/oidc"), {
      allowInsecureRequests,
    });

    expect(result).toEqual([allowInsecureRequests]);
  });

  it("should keep HTTPS enforcement for non-local OIDC issuers", async () => {
    const { testables } = await require("../oidc");
    const allowInsecureRequests = jest.fn();

    const result = testables.getDiscoveryExecuteHooks(new URL("https://accounts.example.com"), {
      allowInsecureRequests,
    });

    expect(result).toBeUndefined();
  });

  it("should use the registered redirect URI for token exchange", async () => {
    process.env.UI_BASE_URL = "http://code-metrics.localhost:3001";
    const { testables } = await require("../oidc");

    const result = testables.getTokenEndpointParameters();

    expect(result).toEqual({
      redirect_uri: "http://code-metrics.localhost:3001/login/callback",
    });
  });

  it("should reconstruct the registered callback URL with authorization response params", async () => {
    process.env.UI_BASE_URL = "http://code-metrics.localhost:3001";
    const { testables } = await require("../oidc");

    const result = testables.getCurrentCallbackUrl({
      originalUrl: "/api/authenticated?code=abc&state=xyz&iss=http%3A%2F%2Flocalhost%3A8080",
    } as any);

    expect(result.toString()).toEqual(
      "http://code-metrics.localhost:3001/login/callback?code=abc&state=xyz&iss=http%3A%2F%2Flocalhost%3A8080",
    );
  });
});

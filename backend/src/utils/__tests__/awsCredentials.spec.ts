import { describe, expect, it } from "@jest/globals";

import { getStaticAwsCredentialConfig } from "../awsCredentials";

describe("getStaticAwsCredentialConfig", () => {
  it("returns an empty config when required credentials are missing", () => {
    expect(getStaticAwsCredentialConfig(undefined, "secret")).toEqual({});
    expect(getStaticAwsCredentialConfig("key", undefined)).toEqual({});
  });

  it("returns static credentials and provider when access key and secret are present", async () => {
    const config = getStaticAwsCredentialConfig("key", "secret", "token");

    expect(config).toMatchObject({
      credentials: {
        accessKeyId: "key",
        secretAccessKey: "secret",
        sessionToken: "token",
      },
    });

    const provider = "credentialDefaultProvider" in config ? config.credentialDefaultProvider() : undefined;
    await expect(provider?.()).resolves.toEqual({
      accessKeyId: "key",
      secretAccessKey: "secret",
      sessionToken: "token",
    });

    const userAgentProvider = "defaultUserAgentProvider" in config ? config.defaultUserAgentProvider : undefined;
    await expect(userAgentProvider?.()).resolves.toEqual([]);

    expect(config).toMatchObject({
      defaultsMode: "standard",
    });
    expect("requestHandler" in config).toBe(true);
  });

  it("uses the static node handler when requested", () => {
    const config = getStaticAwsCredentialConfig("key", "secret", undefined, { preferNodeHttpHandler: true });

    expect(config).toMatchObject({
      defaultsMode: "standard",
    });
    expect("requestHandler" in config && config.requestHandler?.metadata?.handlerProtocol).toBe("http/1.1");
  });
});

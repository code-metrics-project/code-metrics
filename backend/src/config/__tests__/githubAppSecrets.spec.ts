/**
 * @group unit
 * Test to verify GitHub App secret resolution from secrets.yaml
 * Uses test data files to simulate real-world config loading with secret resolution.
 */

import path from "path";
import { promises as fs } from "fs";
import { load } from "js-yaml";
import { resolveAllSecretsWithResolver, SecretResolver } from "../secrets";
import { RemoteConfigWrapper, AuthMethod } from "../../model/config/remote-config";

describe("GitHub App Secret Resolution", () => {
  const testDataDir = path.join(__dirname, "test-data/github-app");

  // Load secrets from test secrets.yaml file and create a resolver
  const createTestSecretResolver = async (): Promise<SecretResolver> => {
    const secretsPath = path.join(testDataDir, "secrets.yaml.example");
    const secretsContent = await fs.readFile(secretsPath, "utf-8");
    const secrets = load(secretsContent) as Record<string, string>;

    return {
      resolve: async (secretName: string) => {
        const value = secrets[secretName];
        if (value === undefined) {
          throw new Error(`Secret not found: ${secretName}`);
        }
        return value;
      },
    };
  };

  it("resolves GitHub App credentials from secrets.yaml into remote-config", async () => {
    const configPath = path.join(testDataDir, "remote-config.yaml");
    const configContent = await fs.readFile(configPath, "utf-8");
    const resolver = await createTestSecretResolver();

    const resolvedContent = await resolveAllSecretsWithResolver(configContent, resolver);
    const config = load(resolvedContent) as RemoteConfigWrapper;

    expect(config).toBeTruthy();
    expect(config.codeManagement?.github?.servers).toHaveLength(1);

    const server = config.codeManagement!.github!.servers[0];
    expect(server.authMethod).toBe(AuthMethod.GITHUB_APP);
    expect(server.githubApp).toBeTruthy();
    expect(server.githubApp!.appId).toBe("123456");
    expect(server.githubApp!.installationId).toBe("12345678");
    // Private key should have newlines escaped for YAML parsing, then unescaped by YAML parser
    expect(server.githubApp!.privateKey).toContain("-----BEGIN RSA PRIVATE KEY-----");
    expect(server.githubApp!.privateKey).toContain("-----END RSA PRIVATE KEY-----");
  });

  it("resolves secrets in multiple server configurations", async () => {
    const configPath = path.join(testDataDir, "remote-config.yaml");
    const configContent = await fs.readFile(configPath, "utf-8");
    const resolver = await createTestSecretResolver();

    const resolvedContent = await resolveAllSecretsWithResolver(configContent, resolver);
    const config = load(resolvedContent) as RemoteConfigWrapper;

    // Both codeManagement and pipelines should have resolved secrets
    const codeManagementServer = config.codeManagement!.github!.servers[0];
    const pipelinesServer = config.pipelines!.github!.servers[0];

    expect(codeManagementServer.githubApp!.appId).toBe("123456");
    expect(pipelinesServer.githubApp!.appId).toBe("123456");

    expect(codeManagementServer.githubApp!.installationId).toBe("12345678");
    expect(pipelinesServer.githubApp!.installationId).toBe("12345678");
  });

  it("preserves multiline private key with proper newlines", async () => {
    const configPath = path.join(testDataDir, "remote-config.yaml");
    const configContent = await fs.readFile(configPath, "utf-8");
    const resolver = await createTestSecretResolver();

    const resolvedContent = await resolveAllSecretsWithResolver(configContent, resolver);
    const config = load(resolvedContent) as RemoteConfigWrapper;

    const privateKey = config.codeManagement!.github!.servers[0].githubApp!.privateKey;

    // The private key should have actual newlines (not escaped \n)
    expect(privateKey.split("\n").length).toBeGreaterThan(1);
    expect(privateKey).toMatch(/^-----BEGIN RSA PRIVATE KEY-----/);
    expect(privateKey).toMatch(/-----END RSA PRIVATE KEY-----\s*$/);
  });

  it("does not resolve secrets when config is read without resolution", async () => {
    const configPath = path.join(testDataDir, "remote-config.yaml");
    const configContent = await fs.readFile(configPath, "utf-8");
    const config = load(configContent) as RemoteConfigWrapper;

    const server = config.codeManagement!.github!.servers[0];
    // Secrets should remain as placeholders
    expect(server.githubApp!.appId).toBe("${secret.GITHUB_APP_ID}");
    expect(server.githubApp!.privateKey).toBe("${secret.GITHUB_APP_PRIVATE_KEY}");
    expect(server.githubApp!.installationId).toBe("${secret.GITHUB_APP_INSTALLATION_ID}");
  });
});

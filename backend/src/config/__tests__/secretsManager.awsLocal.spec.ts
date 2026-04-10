/**
 * @group aws-local-int
 * Integration tests for MiniStack Secrets Manager
 *
 * These tests require MiniStack to be running with Secrets Manager enabled.
 * Tests will be skipped automatically if MiniStack is not available.
 *
 * To run these tests:
 * 1. Start local AWS: docker-compose -f compose/docker-compose-aws-local.yaml up -d
 * 2. Set environment variables: AWS_REGION=us-east-1 AWS_ENDPOINT_URL=http://localhost:4566
 * 3. Run tests: npm run test:aws-local-int
 */

import { SecretsManagerClient, CreateSecretCommand, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { getSecretsManagerResolver } from "../impl/secrets_manager";
import { resolveAllSecretsWithResolver } from "../secrets";

const isMiniStackAvailable = () => !!(process.env.AWS_ENDPOINT_URL || process.env.MINISTACK_ENDPOINT);

const describeIfMiniStack = isMiniStackAvailable() ? describe : describe.skip;

describeIfMiniStack("Secrets Manager with MiniStack", () => {
  let client: SecretsManagerClient;
  const testSecretName = "test-secret-" + Date.now();

  beforeAll(() => {
    // Configure client for MiniStack if AWS_ENDPOINT_URL is set
    const endpointUrl = process.env.AWS_ENDPOINT_URL || process.env.MINISTACK_ENDPOINT;
    client = new SecretsManagerClient({
      region: process.env.AWS_REGION || "us-east-1",
      ...(endpointUrl && { endpoint: endpointUrl }),
    });
  });

  afterAll(async () => {
    // Clean up test secret if running against MiniStack
    if (isMiniStackAvailable()) {
      try {
        // Note: MiniStack doesn't require DeleteSecretCommand cleanup in tests
        // but we can add it if needed
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  it("creates and retrieves a secret from MiniStack", async () => {
    // Create a test secret
    await client.send(
      new CreateSecretCommand({
        Name: testSecretName,
        SecretString: "test-value-123",
      }),
    );

    // Retrieve the secret
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: testSecretName,
      }),
    );

    expect(response.SecretString).toBe("test-value-123");
  });

  it("resolves secrets in configuration strings", async () => {
    // Create a test secret for config resolution
    const configSecretName = "config-test-" + Date.now();
    await client.send(
      new CreateSecretCommand({
        Name: configSecretName,
        SecretString: "my-api-key-789",
      }),
    );

    // Resolve secret in a config string
    const resolver = getSecretsManagerResolver();
    const configString = `apiKey: "\${secret.${configSecretName}}"`;
    const resolved = await resolveAllSecretsWithResolver(configString, resolver);

    expect(resolved).toBe('apiKey: "my-api-key-789"');
  });
});

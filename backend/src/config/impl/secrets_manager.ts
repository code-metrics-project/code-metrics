import { SecretResolver } from "../secrets";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { getEnvConfigItem } from "../sources/source";

/**
 * Returns a {@link SecretResolver} that uses AWS Secrets Manager.
 * Supports local testing with LocalStack by setting AWS_ENDPOINT_URL environment variable.
 */
export const getSecretsManagerResolver = (): SecretResolver => {
  const region = getEnvConfigItem("AWS_REGION");
  const endpointUrl = getEnvConfigItem("AWS_ENDPOINT_URL");

  const client = new SecretsManagerClient({
    region,
    ...(endpointUrl && { endpoint: endpointUrl }),
  });

  return {
    async resolve(secretName: string): Promise<string> {
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });
      const response = await client.send(command);
      return response.SecretString;
    },
  };
};

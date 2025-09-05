import { SecretResolver } from "../secrets";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { getConfigItem } from "../sources/source";

/**
 * Returns a {@link SecretResolver} that uses AWS Secrets Manager.
 */
export const getSecretsManagerResolver = (): SecretResolver => {
  const client = new SecretsManagerClient({
    region: getConfigItem("AWS_REGION"),
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

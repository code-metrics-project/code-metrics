import { getSecretsManagerResolver } from "./impl/secrets_manager";
import { logger } from "../utils/logger/logger";
import { getFileSecretResolver } from "./impl/file";
import { getConfigItem } from "./sources/source";

export type SecretResolver = {
  resolve(secretName: string): Promise<string>;
};

const DEFAULT_SECRET_RESOLVER_IMPL = "file";

let secretResolver: SecretResolver;

const getSecretResolver = (): SecretResolver => {
  if (!secretResolver) {
    const implName = getConfigItem("SECRET_RESOLVER_IMPL", DEFAULT_SECRET_RESOLVER_IMPL);
    switch (implName) {
      case "file":
        secretResolver = getFileSecretResolver();
        break;
      case "secretsmanager":
        secretResolver = getSecretsManagerResolver();
        break;
      default:
        throw new Error(`Unsupported secret resolver implementation: ${implName}`);
    }
    logger(`Using ${implName} secret resolver`);
  }
  return secretResolver;
};

export const resolveAllSecrets = async (input: string): Promise<string> => {
  const resolver = getSecretResolver();
  return resolveAllSecretsWithResolver(input, resolver);
};

export const resolveAllSecretsWithResolver = async (input: string, resolver: SecretResolver): Promise<string> => {
  const reg = /\${secret\.([a-zA-Z0-9\\/\-_.]+)}/g;
  let resolved = input;
  let result;
  while ((result = reg.exec(input)) !== null) {
    const replacement = await resolver.resolve(result[1]);
    resolved = resolved.replace(result[0], replacement);
  }
  return resolved;
};

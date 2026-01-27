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
    // Check if the secret placeholder is inside a quoted YAML string
    // If so, escape newlines to preserve the multiline content
    const matchIndex = resolved.indexOf(result[0]);
    const beforeMatch = resolved.substring(0, matchIndex);
    const isInsideQuotes = isInsideQuotedString(beforeMatch, result[0], resolved);
    const escapedReplacement = isInsideQuotes ? replacement.replace(/\n/g, "\\n") : replacement;
    resolved = resolved.replace(result[0], escapedReplacement);
  }
  return resolved;
};

/**
 * Determines if a placeholder is inside a quoted YAML string
 */
const isInsideQuotedString = (beforeMatch: string, placeholder: string, fullContent: string): boolean => {
  // Find the start of the current line containing the placeholder
  const lastNewline = beforeMatch.lastIndexOf("\n");
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineContent = fullContent.substring(lineStart);

  // Check if the line contains a pattern like: key: "...${secret...}..."
  // or key: '...${secret...}...'
  const colonIndex = lineContent.indexOf(":");
  if (colonIndex === -1) return false;

  const afterColon = lineContent.substring(colonIndex + 1).trimStart();
  return afterColon.startsWith('"') || afterColon.startsWith("'");
};

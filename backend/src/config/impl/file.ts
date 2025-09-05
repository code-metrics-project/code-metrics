import { SecretResolver } from "../secrets";
import { getConfigDirs, readConfig } from "../config";

let fileContents;

/**
 * Returns a {@link SecretResolver} that uses a JSON file. Do not use this in production
 * without appropriate security controls for the secrets file.
 */
export const getFileSecretResolver = (): SecretResolver => {
  return {
    async resolve(secretName: string): Promise<string> {
      if (!fileContents) {
        const configDirs = getConfigDirs();
        fileContents = await readConfig(configDirs, "secrets", { required: false, resolveSecrets: false }, {});
      }
      return fileContents[secretName];
    },
  };
};

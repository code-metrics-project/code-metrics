import { AuthenticationResult, Authenticator, baseAuthenticator } from "../auth";
import { logger } from "../../utils/logger/logger";

//https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth-ropc

import { UsernamePasswordCredential } from "@azure/identity";

const tenantId = process.env.AEID_TENANTID ?? "";
const clientId = process.env.AEID_CLIENTID ?? "";
const scopes = process.env.AEID_SCOPE ?? "https://graph.microsoft.com/.default";

export const getAzureEntraIDAuthenticator = (): Authenticator => {
  return { ...baseAuthenticator, authenticateUser };
};

const authenticateUser = async (username: string, password: string): Promise<AuthenticationResult> => {
  const credential = new UsernamePasswordCredential(tenantId, clientId, username, password);

  try {
    const user = await credential.getToken([scopes]);
    logger(`Authentication succeeded with username: ${username}`);
    return { success: true, user: { name: username } };
  } catch (error) {
    logger(`Authentication failed for user: ${username}`);
    logger(`${error.message}`);
    return { success: false };
  }
};

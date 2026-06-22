import { Keycloak } from "keycloak-backend";
import { AuthenticationResult, Authenticator, baseAuthenticator } from "../auth";
import { getEnvConfigItem } from "../../config/sources/source";
import { error } from "../../utils/logger/logger";

// Not used yet but here to support other methods such as oauth etc.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const KEYCLOAK_AUTH_METHOD = getEnvConfigItem("KEYCLOAK_AUTH_METHOD", "directgrant");
const KEYCLOAKURI = getEnvConfigItem("KEYCLOAK_URI", "http://127.0.0.1:8086");
const KEYCLOAKREALM = getEnvConfigItem("KEYCLOAK_REALM", "codemetrics");
const KEYCLOAKCLIENTID = getEnvConfigItem("KEYCLOAK_CLIENT_ID", "codemetrics");

export const getKeyCloakAuthenticator = (): Authenticator => {
  return { ...baseAuthenticator, authenticateUser };
};

const authenticateUser = async (username: string, password: string): Promise<AuthenticationResult> => {
  const keycloak = new Keycloak({
    realm: KEYCLOAKREALM,
    keycloak_base_url: KEYCLOAKURI,
    client_id: KEYCLOAKCLIENTID,
    username: username,
    password: password,
    is_legacy_endpoint: false,
  });

  try {
    await keycloak.accessToken.get();
    // Authentication succeeded, you can fetch user information or handle it as needed
    return { success: true, user: { name: username } };
  } catch (err) {
    error(`Authentication failed for user: ${username}`, err);
    return { success: false };
  }
};

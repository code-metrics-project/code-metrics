import { AuthenticationOptions, authenticate } from "ldap-authentication";
import { AuthenticationResult, Authenticator, baseAuthenticator } from "../auth";
import { logger } from "../../utils/logger/logger";

// There are 3 ways to bind to LDAP:
// 1. Bind as admin and search for user, then bind as user
// 2. Bind as user
// 3. Anonymous bind and search for user, then bind as user

const adminAuth = process.env.LDAP_ADMIN_AUTH ?? true;
const LDAPURI = process.env.LDAP_URI ?? "ldap://localhost:1389";
const LDAPBindDN = process.env.LDAP_BIND_DN ?? "cn=admin,dc=example,dc=org";
const LDAPBindPassword = process.env.LDAP_BIND_PASSWORD ?? "admin";
const LDAPUserSearchBase = process.env.LDAP_USER_SEARCH_BASE ?? "ou=users,dc=example,dc=org";
const LDAPROOTDN = process.env.LDAP_ROOT_DN ?? "dc=example,dc=org";
const LDAPUsernameAttribute = process.env.LDAP_USERNAME_ATTRIBUTE ?? "uid";
const LDAPTLS = !!process.env.LDAP_TLS;

export const getLDAPAuthenticator = (): Authenticator => {
  return { ...baseAuthenticator, authenticateUser };
};

const authenticateUser = async (username: string, password: string): Promise<AuthenticationResult> => {
  const AuthOptions: AuthenticationOptions = {
    ldapOpts: undefined,
  };

  const ldapOpts = {
    url: LDAPURI,
    tlsOptions: { rejectUnauthorized: LDAPTLS },
  };

  if (adminAuth) {
    AuthOptions.adminDn = LDAPBindDN;
    AuthOptions.adminPassword = LDAPBindPassword;
    AuthOptions.userSearchBase = LDAPUserSearchBase;
  } else {
    AuthOptions.userDn = LDAPUsernameAttribute + "=" + username + "," + LDAPROOTDN;
    AuthOptions.userSearchBase = LDAPUserSearchBase;
  }

  if (adminAuth) {
    AuthOptions.adminDn = LDAPBindDN;
    AuthOptions.adminPassword = LDAPBindPassword;
    AuthOptions.userSearchBase = LDAPUserSearchBase;
  } else {
    AuthOptions.userDn = LDAPUsernameAttribute + "=" + username + "," + LDAPROOTDN;
    AuthOptions.userSearchBase = LDAPUserSearchBase;
  }

  const user = await authenticate(AuthOptions);
  if (user) {
    logger(`Authentication succeeded with username: ${username}`);
    return { success: true, user: { name: username } };
  } else {
    logger(`Authentication failed for user: ${username}`);
    return { success: false };
  }
};

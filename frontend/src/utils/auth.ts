/**
 * Check if a JWT token is expired.
 * @param token
 */
export function isTokenExpired(token: string | undefined): boolean {
  const expiry = getTokenExpiry(token);
  return Date.now() >= expiry;
}

/**
 * Get the expiry time of a JWT token in unix epoch milliseconds.
 * @param token
 */
export function getTokenExpiry(token: string | undefined): number {
  if (!token) {
    return 0;
  }
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    return 0;
  }

  try {
    const payload = JSON.parse(atob(tokenParts[1]));
    return payload.exp * 1000;
  } catch {
    return 0;
  }
}

/**
 * Get the issued at time of a JWT token in unix epoch milliseconds.
 * @param token
 */
export function getTokenIssuedAt(token: string | undefined): number {
  if (!token) {
    return 0;
  }
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    return 0;
  }

  try {
    const payload = JSON.parse(atob(tokenParts[1]));
    return payload.iat * 1000;
  } catch {
    return 0;
  }
}

/**
 * Get the time to live (TTL) of a JWT token in milliseconds
 * by subtracting the issued at time from the expiry time.
 * @param token
 */
export function getTokenTtl(token: string | undefined): number {
  const expiry = getTokenExpiry(token);
  if (expiry === 0) {
    return 0;
  }
  const issuedAt = getTokenIssuedAt(token);
  if (issuedAt === 0) {
    return 0;
  }
  return expiry - issuedAt;
}

/**
 * Get the roles from a JWT token's `roles` claim.
 * @param token
 * @returns an array of role strings, or an empty array if the token is invalid or has no roles
 */
export function getTokenRoles(token: string | undefined): string[] {
  if (!token) {
    return [];
  }
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    return [];
  }

  try {
    const payload = JSON.parse(atob(tokenParts[1]));
    return Array.isArray(payload.roles) ? payload.roles : [];
  } catch {
    return [];
  }
}

/**
 * Check if a JWT token contains the specified role.
 * @param token
 * @param role the role to check for
 */
export function hasRole(token: string | undefined, role: string): boolean {
  return getTokenRoles(token).includes(role);
}

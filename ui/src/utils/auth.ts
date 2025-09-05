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
  } catch (e) {
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
  } catch (e) {
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

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

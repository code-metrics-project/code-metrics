/**
 * Mock for @octokit/auth-app that properly integrates with Octokit.
 *
 * This mock implements the auth strategy interface that Octokit expects,
 * including the `hook` function that intercepts HTTP requests to add
 * authentication headers.
 *
 * Usage in tests:
 *   jest.mock("@octokit/auth-app", () => require("../../tests/mocks/octokit-auth-app"));
 */

export type CreateAppAuthOptions = {
  appId: string;
  privateKey: string;
  installationId: string;
};

type AuthResult = {
  type: "installation";
  token: string;
  tokenType: "token";
};

type RequestFunction = (route: string, parameters?: Record<string, unknown>) => Promise<unknown>;

type AuthFunction = {
  (): Promise<AuthResult>;
  hook: (request: RequestFunction, route: string, parameters?: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Creates a mock GitHub App auth function that works with Octokit.
 * The hook function intercepts requests and adds the authorization header.
 */
export const createAppAuth = (_options: CreateAppAuthOptions): AuthFunction => {
  const auth = async (): Promise<AuthResult> => ({
    type: "installation",
    token: "mock-installation-token",
    tokenType: "token",
  });

  // The hook function is called by Octokit to authenticate requests
  auth.hook = (request: RequestFunction, route: string, parameters?: Record<string, unknown>) => {
    // Add authorization header and pass through to the original request
    return request(route, {
      ...parameters,
      headers: {
        ...(parameters?.headers as Record<string, string> | undefined),
        authorization: "token mock-installation-token",
      },
    });
  };

  return auth;
};

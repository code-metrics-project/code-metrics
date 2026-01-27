import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

export type GitHubAppConfig = {
  appId: string;
  privateKey: string;
  installationId: string;
};

/**
 * Creates an authenticated Octokit instance using GitHub App authentication
 */
export function createGitHubAppOctokit(config: GitHubAppConfig, baseUrl?: string): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.appId,
      privateKey: config.privateKey,
      installationId: config.installationId,
    },
    baseUrl: baseUrl || "https://api.github.com",
  });
}

/**
 * Validates GitHub App configuration
 */
export function validateGitHubAppConfig(config: GitHubAppConfig): string[] {
  const errors: string[] = [];

  if (!config.appId || config.appId.trim() === "") {
    errors.push("GitHub App ID is required");
  }

  if (!config.privateKey || config.privateKey.trim() === "") {
    errors.push("GitHub App private key is required");
  }

  if (!config.installationId || config.installationId.trim() === "") {
    errors.push("GitHub App installation ID is required");
  }

  // Validate private key format
  if (config.privateKey && !config.privateKey.includes("BEGIN") && !config.privateKey.includes("PRIVATE KEY")) {
    errors.push("GitHub App private key appears to be in invalid format");
  }

  return errors;
}

/**
 * Test GitHub App authentication
 */
export async function testGitHubAppAuth(
  config: GitHubAppConfig,
  baseUrl?: string,
): Promise<{
  success: boolean;
  error?: string;
  appName?: string;
  installationAccount?: string;
}> {
  try {
    const octokit = createGitHubAppOctokit(config, baseUrl);

    // Test the authentication by getting app info
    const { data: app } = await octokit.apps.getAuthenticated();

    // Get installation info
    const { data: installation } = await octokit.apps.getInstallation({
      installation_id: parseInt(config.installationId, 10),
    });

    return {
      success: true,
      appName: app.name,
      installationAccount: installation.account?.login,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

# GitHub App Authentication

This guide explains how to configure GitHub App authentication for accessing GitHub repositories, issues, and workflows. GitHub Apps provide more secure and scalable authentication compared to Personal Access Tokens, especially for organization repositories.

## Overview

GitHub Apps offer several advantages over Personal Access Tokens (PATs):

- **Organization-approved**: Bypass third-party application restrictions
- **Fine-grained permissions**: Only grant specific permissions needed
- **Higher rate limits**: 5000 requests/hour per installation vs shared PAT limits
- **Installation-based**: Works across multiple repositories in an organization
- **Audit trail**: Clear visibility of app actions in GitHub audit logs
- **Secure authentication**: Private key-based, no shared tokens

## Prerequisites

- Access to create GitHub Apps in your organization or personal account
- Administrative access to install the app on target repositories
- Ability to generate and securely store private keys

## Step 1: Create a GitHub App

### 1.1 Navigate to GitHub App Settings

**For Organizations:**

1. Go to your organization settings: `https://github.com/organizations/YOUR_ORG/settings`
2. Click "Developer settings" → "GitHub Apps"
3. Click "New GitHub App"

**For Personal Accounts:**

1. Go to your personal settings: `https://github.com/settings`
2. Click "Developer settings" → "GitHub Apps"
3. Click "New GitHub App"

### 1.2 Configure Basic Information

- **GitHub App name**: `codemetrics-[your-org]` (must be globally unique)
- **Description**: "CodeMetrics application for repository and issue analysis"
- **Homepage URL**: Your organization's URL or repository URL
- **Webhook URL**: Leave blank (not needed for API access)
- **Webhook secret**: Leave blank

### 1.3 Set Permissions

Configure the following **Repository permissions**:

| Permission        | Access Level | Purpose                                             |
| ----------------- | ------------ | --------------------------------------------------- |
| **Issues**        | Read         | Fetch GitHub Issues for project/incident management |
| **Metadata**      | Read         | Access basic repository information                 |
| **Actions**       | Read         | Access GitHub Actions workflow runs (optional)      |
| **Contents**      | Read         | Access repository files and commits (optional)      |
| **Pull requests** | Read         | Link issues to pull requests (optional)             |

Configure the following **Organization permissions** (if applicable):

| Permission  | Access Level | Purpose                                           |
| ----------- | ------------ | ------------------------------------------------- |
| **Members** | Read         | Access organization member information (optional) |

### 1.4 Installation Settings

- **Where can this GitHub App be installed?**:
  - Choose "Only on this account" for organization-specific apps
  - Choose "Any account" if you want to reuse across organizations

### 1.5 Create the App

Click "Create GitHub App" to create your application.

## Step 2: Generate Authentication Credentials

### 2.1 Get App ID

After creating the app:

1. Note the **App ID** displayed in the "About" section (e.g., `123456`)
2. This will be used in your configuration

### 2.2 Generate Private Key

1. Scroll down to the "Private keys" section
2. Click "Generate a private key"
3. Download the `.pem` file
4. **Important**: Store this file securely - you can only download it once

### 2.3 Install the App

1. Click "Install App" in the left sidebar
2. Choose the account/organization where you want to install
3. Select repository access:
   - **All repositories**: Gives access to all current and future repos
   - **Selected repositories**: Choose specific repositories (recommended)
4. Click "Install"

### 2.4 Get Installation ID

After installation:

1. Note the URL: `https://github.com/organizations/YOUR_ORG/settings/installations/12345678`
2. The number at the end (`12345678`) is your **Installation ID**

## Step 3: Configure CodeMetrics

### 3.1 Update Remote Configuration

Edit your `remote-config.yaml` file and add a GitHub App server:

```yaml
codeManagement:
  github:
    servers:
      - id: github-app
        url: https://api.github.com
        authMethod: GITHUB_APP
        githubApp:
          appId: "123456" # Your App ID
          privateKey: |
            -----BEGIN RSA PRIVATE KEY-----
            MIIEpAIBAAKCAQEA...
            (paste your entire private key here)
            ...
            -----END RSA PRIVATE KEY-----
          installationId: "12345678" # Your Installation ID
        branches:
          - main
          - develop
          - feature/*
          - release/*

ticketManagement:
  github:
    servers:
      - id: github-app
        url: https://api.github.com
        authMethod: GITHUB_APP
        githubApp:
          appId: "123456"
          privateKey: |
            -----BEGIN RSA PRIVATE KEY-----
            MIIEpAIBAAKCAQEA...
            (same private key as above)
            ...
            -----END RSA PRIVATE KEY-----
          installationId: "12345678"
        defaults:
          owner: "YOUR_ORG"
          repo: "your-repo"
          ticketTypes:
            - bug
            - enhancement
            - feature
          stateFilter: "all"

pipelines:
  github:
    servers:
      - id: github-app
        url: https://api.github.com
        authMethod: GITHUB_APP
        githubApp:
          appId: "123456"
          privateKey: |
            -----BEGIN RSA PRIVATE KEY-----
            MIIEpAIBAAKCAQEA...
            (same private key as above)
            ...
            -----END RSA PRIVATE KEY-----
          installationId: "12345678"
        branches:
          - main
```

### 3.2 Update Workload Configuration

Edit your `workload-config.yaml` file:

```yaml
workloads:
  - id: my-github-workload
    name: "My GitHub Workload"
    codeManagement:
      type: github
      serverId: github-app # Must match server ID above
      projectName: YOUR_ORG
      repoGroups:
        backend:
          components:
            - repo: your-repo
              name: backend
              paths: ["/backend"]
    projectManagement:
      type: github
      serverId: github-app
      owner: "YOUR_ORG"
      repo: "your-repo"
      stateFilter: "all"
      ticketTypes:
        - bug
        - enhancement
        - feature
    incidents:
      type: github
      serverId: github-app
      owner: "YOUR_ORG"
      repo: "your-repo"
      stateFilter: "all"
      ticketTypes:
        - bug
        - incident
    # ... other configuration
```

## Step 4: Security Best Practices

### 4.1 Private Key Management

**For Development:**

- Store private key directly in configuration files
- Add configuration files to `.gitignore`
- Never commit private keys to version control

**For Production:**

- Use environment variables:
  ```yaml
  githubApp:
    appId: "${GITHUB_APP_ID}"
    privateKey: "${GITHUB_APP_PRIVATE_KEY}"
    installationId: "${GITHUB_APP_INSTALLATION_ID}"
  ```
- Store private key in secure secret management systems
- Rotate private keys regularly (generate new ones periodically)

### 4.2 Permission Management

- **Principle of least privilege**: Only grant permissions actually needed
- **Regular audits**: Review app permissions and installations periodically
- **Repository scope**: Install only on repositories that need access
- **Monitor usage**: Check GitHub audit logs for app activity

### 4.3 Key Rotation

To rotate private keys:

1. Generate a new private key in GitHub App settings
2. Update your configuration with the new key
3. Deploy the updated configuration
4. Delete the old private key from GitHub App settings

## Step 5: Testing and Validation

### 5.1 Test Authentication

Create a simple test script to verify your GitHub App configuration:

```javascript
const { Octokit } = require("@octokit/rest");
const { createAppAuth } = require("@octokit/auth-app");

const octokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: "YOUR_APP_ID",
    privateKey: "YOUR_PRIVATE_KEY",
    installationId: "YOUR_INSTALLATION_ID",
  },
});

async function testAuth() {
  try {
    // Test app authentication
    const { data: app } = await octokit.apps.getAuthenticated();
    console.log(`✅ App authenticated: ${app.name}`);

    // Test repository access
    const { data: repos } = await octokit.apps.listReposAccessibleToInstallation();
    console.log(`✅ Found ${repos.repositories.length} accessible repositories`);

    // Test specific repository
    const { data: repo } = await octokit.repos.get({
      owner: "YOUR_ORG",
      repo: "your-repo",
    });
    console.log(`✅ Repository accessible: ${repo.full_name}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testAuth();
```

### 5.2 Validate Configuration

After starting the CodeMetrics application:

```bash
# Test configuration endpoint
curl "http://localhost:3000/api/system/config" | jq '.workloads[0].repos'

# Test issues endpoint
curl "http://localhost:3000/api/tickets/bugs?workloadId=my-github-workload"
```

## Troubleshooting

### Common Issues

| Error                                    | Cause                                           | Solution                                 |
| ---------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| `Bad credentials`                        | Invalid App ID, private key, or installation ID | Verify all credentials are correct       |
| `Not Found`                              | App not installed on repository                 | Install app on target repository         |
| `Resource not accessible by integration` | Insufficient permissions                        | Add required permissions to GitHub App   |
| `Installation not found`                 | Invalid installation ID                         | Check installation ID in GitHub settings |

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
export DEBUG=octokit*
npm run dev
```

### Rate Limiting

GitHub Apps have higher rate limits than PATs:

- **5000 requests/hour** per installation
- **Rate limit headers** in API responses show remaining quota
- **Automatic retry** with exponential backoff for rate limit errors

## Migration from Personal Access Tokens

If migrating from PAT authentication:

1. **Create GitHub App** following steps above
2. **Update configuration** to use `GITHUB_APP` auth method
3. **Test thoroughly** with new authentication
4. **Revoke old PATs** once migration is complete
5. **Update documentation** for your team

## Advanced Configuration

### Multiple Organizations

For multiple organizations, create separate GitHub Apps or use organization-wide installation:

```yaml
ticketManagement:
  github:
    servers:
      - id: github-app-org1
        authMethod: GITHUB_APP
        githubApp:
          appId: "123456"
          installationId: "11111111" # Org 1 installation
      - id: github-app-org2
        authMethod: GITHUB_APP
        githubApp:
          appId: "123456"
          installationId: "22222222" # Org 2 installation
```

### GitHub Enterprise

For GitHub Enterprise Server:

```yaml
codeManagement:
  github:
    servers:
      - id: github-enterprise-app
        url: https://github.enterprise.com/api/v3
        authMethod: GITHUB_APP
        githubApp:
          appId: "123456"
          privateKey: |
            -----BEGIN RSA PRIVATE KEY-----
            ...
          installationId: "12345678"
```

## References

- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [GitHub App Permissions](https://docs.github.com/en/developers/apps/building-github-apps/setting-permissions-for-github-apps)
- [Octokit Authentication](https://github.com/octokit/auth-app.js)
- [CodeMetrics Configuration Guide](./configuration.md)

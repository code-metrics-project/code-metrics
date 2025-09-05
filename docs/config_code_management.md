# Configuration: Code Management

This section is part of the `remote-config.yaml` configuration file. See the [configuration overview](./configuration.md) for further information.

## Azure DevOps (ADO)

> Note the same token value may also be used for retrieving Work Items within the [project management](./config_project_management.md) configuration if required and permission is provided within the token scope.

1. Create an Azure Personal Access Token.  
   To call ADO you'll need to authenticate with a PAT. See instructions [here](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=preview-page).

2. Paste the result in your respective `remote-config.yaml` file configuration within a `codeManagement.azure` server object's `apiKey` field.

## GitHub

1. Create a Personal Access Token.
   Navigate to [https://github.com/settings/tokens](https://github.com/settings/tokens) and create a token with the following scopes:

    - public_repo
    - read:org
    - read:project
    - repo:status

2. Paste the result in your respective `remote-config.json` file configuration within a `codeManagement.github` server object's `apiKey` field.

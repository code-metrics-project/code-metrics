# Azure Entra ID Authentication

## Introduction

CodeMetrics supports Azure Entra ID (formerly AzureAD) for user authentication. This is a back-end authentication mechanism, where the CodeMetrics backend queries Azure Entra ID to authenticate the user.

> **Note**
> Currently, only 'OAuth 2.0 Resource Owner Password Credentials' (ROPC) is supported.

## Configuration

Set the environment variable:

```
AUTHENTICATOR_IMPL=azureEntraId
```

Then configure the following environment variables as needed

Set the following environment variables:
```
AEID_TENANTID='111-1111-1111-1111'
AEID_CLIENTID='2222-2222-222-2222'
AEID_SCOPE='https://graph.microsoft.com/.default'
```

### Azure Application Setup

* Create users in [Azure Entra ID](https://portal.azure.com/?quickstart=true#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview)
* [Register your App](https://portal.azure.com/?quickstart=true#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade/isMSAApp~/false)
* Enter the App in Azure, then Click authentication on the left -> Supported account types -> Select: 	`Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)`
* Enter the App in Azure, then Click authentication on the left, then at the bottom, Advanced settings -> Allow public client flows -> Enable the following mobile and desktop flows: `YES`
* Enter the App in Azure, then Click Api Permissions on the left, then `Grant admin consent for default directory`

Username is the user's principal name in Entra ID (Which may or may not be their email address)

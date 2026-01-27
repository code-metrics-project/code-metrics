# User authentication

To use CodeMetrics users require authentication. You configure how users authenticate using one of the supported authentication providers:

| Name         | Details                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| file         | User configuration is represented as password hashes and usernames in a file named `users.json`.                                                |
| azureEntraId | Authenticate against Azure Entra ID using RPOC                                                                                                  |
| cognito      | AWS Cognito user store. This authenticator implementation holds items in an external Cognito instance. It requires appropriate AWS credentials. |
| keycloak     | Direct Grant Keycloak Authentication                                                                                                            |
| ldap         | User is verified against LDAP/AD                                                                                                                |
| oidc         | OpenID Connect (OIDC) Authentication                                                                                                            |

## Setting the authenticator implementation

Set the authenticator implementation to use with the `AUTHENTICATOR_IMPL` environment variable.

> For example:
>
> ```
> AUTHENTICATOR_IMPL=file
> ```

## Configuring the access token secret

Once a user has authenticated with one of the providers, CodeMetrics issues them a time-limited token. This token is used by the user's browser when calling the CodeMetrics backend APIs.

The token is generated based on a secret - the `ACCESS_TOKEN_SECRET`. This value is sensitive and should be protected, as it is used by the backend to determine whether to trust a token presented by the user's browser.

You can set the `ACCESS_TOKEN_SECRET` environment variable to any string.

> **Important**
> You must ensure that all instances of the backend (e.g. all container instances, or all Lambda instances) share the same value for the `ACCESS_TOKEN_SECRET`, so that they can validate the token issued to the user.

---

## Authentication providers

This section lists the supported authentication providers.

### File-based authenticator (default)

CodeMetrics supports file-based authentication. This is a simple authentication mechanism where the user's credentials are stored in a file on the server.

See the [File-based Authentication](./authentication_file.md) documentation for more information.

### AWS Cognito (via AWS API)

CodeMetrics supports AWS Cognito for user authentication. This is a back-end authentication mechanism, where the CodeMetrics backend queries AWS Cognito to authenticate the user.

See the [Cognito Authentication](./authentication_cognito.md) documentation for more information.

### OpenID Connect (OIDC)

CodeMetrics supports OpenID Connect (OIDC) for user authentication. This allows you to use OIDC providers such as Google, Microsoft, or GitHub to authenticate users.

This is a front-end authentication flow, where the user is redirected to an OIDC provider to authenticate.

See the [OIDC Authentication](./authentication_oidc.md) documentation for more information.

### Azure Entra ID (formerly AzureAD)

CodeMetrics supports Azure Entra ID (formerly AzureAD) for user authentication. This is a back-end authentication mechanism, where the CodeMetrics backend queries Azure Entra ID to authenticate the user.

See the [Azure Entra ID Authentication](./authentication_azure.md) documentation for more information.

### LDAP

CodeMetrics supports using an LDAP registry for user authentication. This is a back-end authentication mechanism, where the CodeMetrics backend queries an LDAP store to authenticate the user.

See the [LDAP Authentication](./authentication_ldap.md) documentation for more information.

### Keycloak (via Direct Grant)

If you are using [Keycloak](https://www.keycloak.org/) as your identity provider, you can use the Direct Grant flow to authenticate users. This is a backend API call from the CodeMetrics API server to the Keycloak server.

See the [Keycloak Direct Grant Authentication](./authentication_keycloak.md) documentation for more information.

## Automatic Login

The Frontend supports automatically logging in a generic user via config.
This is useful for demo purposes, or for when a user that does not require authentication such as running locally.

> [!WARNING]
> You should not enable this in a hosted production environment.

### Configuring Automatic Login

Note: This feature only works with flows that use the webUI for password entry.
Flows such as OIDC that require a redirect to an external provider will not work with this feature.

To configure automatic login:

1. Update the config file for the frontend server to include the following:

```json
{
  "apiBaseUrl": "<URL to the backend API>:<port>",
  "auth": {
    "required": false,
    "provided": {
      "user": "Username",
      "pass": "Password"
    }
  }
}
```

4. Start the frontend server.

The frontend server will automatically log in the user and redirect to the dashboard.

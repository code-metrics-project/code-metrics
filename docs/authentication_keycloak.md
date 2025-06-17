# Keycloak Direct Grant Authentication

## Introduction

If you are using [Keycloak](https://www.keycloak.org/) as your identity provider, you can use the Direct Grant flow to authenticate users. This is a backend API call from the CodeMetrics API server to the Keycloak server.

## Configuration

Set the environment variable:

```
AUTHENTICATOR_IMPL=keycloak
```

This authenticator queries the specified Keycloak instance to authenticate the user.

Set the following environment variables:
```
KEYCLOAK_URI='http://127.0.0.1:8086';
KEYCLOAK_REALM='codemetrics';
KEYCLOAK_CLIENT_ID='codemetrics';
```

Keycloak Realm/Client should be configured to have `Direct access grants` enabled for this to work.

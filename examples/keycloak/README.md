# OIDC SSO with Keycloak

## Start Keycloak

Run this from the root directory:

```bash
docker compose --project-directory . -f compose/docker-compose-keycloak.yaml up --force-recreate
```

Keycloak is configured to run on port 8086.

## Configure backend

Set the following configuration in the `.env` file for the backend:

```bash
AUTHENTICATOR_IMPL=oidc
OIDC_ISSUER_BASE_URL=http://localhost:8086/realms/codemetrics
OIDC_CLIENT_ID=codemetrics
OIDC_CLIENT_SECRET=changeme
```

This example uses `http://localhost:8086` for local development only. Production deployments should expose Keycloak over HTTPS and use an `https://` issuer URL.

## Test the OIDC flow

### Prerequisites

Start the backend and frontend applications

### Steps

1. Navigate to `http://localhost:3001/login`
2. You will be redirected to the Keycloak login page
3. Login with the following credentials:
   - Username: `admin`
   - Password: `admin`
4. You will be redirected back to CodeMetrics as an authenticated user

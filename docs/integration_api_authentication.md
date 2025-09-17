# Authenticating to the CodeMetrics API

To access the CodeMetrics API programmatically, you need to authenticate using a Service Token. Service Tokens provide secure, long-lived access to the API without requiring interactive user authentication.

## Service Tokens

Service Tokens are long-lived authentication credentials that allow applications and scripts to access the CodeMetrics API on behalf of a user. They provide several advantages over traditional username/password authentication:

- **Long-lived** - Service Tokens remain valid for extended periods (default: 1 year)
- **Secure** - No need to store or transmit user passwords
- **Revocable** - Tokens can be revoked immediately if compromised
- **Auditable** - Token usage can be tracked and monitored

## Generating a Service Token

There are two ways to generate a Service Token for your CodeMetrics instance:

1. **Admin UI Method** (Recommended for most users)
2. **API Method** (For programmatic token generation)

### Prerequisites

- Access to a CodeMetrics instance
- Valid user account with appropriate permissions
- Ability to authenticate to the CodeMetrics web interface

## Method 1: Using the Admin UI (Recommended)

The easiest way to generate a Service Token is through the Administration Portal:

### Step 1: Access the Admin Portal

1. Log in to your CodeMetrics instance using your regular user credentials
2. Navigate to the Administration section
3. Click on "Manage Service Tokens" from the Service Tokens card

### Step 2: Create the Token

1. Click the "Create Token" button
2. Enter the subject name for the service or application that will use this token
3. Click "Create Token"

### Step 3: Copy Your Token

After creation, the token value is displayed only once. Copy and store it securely, as it cannot be retrieved again for security reasons.

For detailed instructions with screenshots, see the [Administration Portal documentation](./admin_portal.md#creating-a-new-service-token).

## Method 2: Using the API Directly

For programmatic token generation or when integrating token creation into automated workflows:

### Step 1: Authenticate to CodeMetrics

First, log in to your CodeMetrics instance using your regular user credentials through the web interface.

### Step 2: Generate the Token

To generate a Service Token, make a POST request to the Service Token generation endpoint with a JSON body containing the subject:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"subject": "your-service-name"}' \
  https://your-codemetrics-instance/api/tokens
```

The `subject` field should contain the name for the service or application that will use this token.

> **Note**: You'll need to obtain your session token from your authenticated session.

You can use a tool like Postman or your browser's developer console to make this request.

### Step 3: Secure Your Token

The API response will contain your new Service Token:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Security Considerations for Both Methods

**Important Security Considerations:**

- **Store securely** - Save your Service Token in a secure location (e.g., environment variables, secret management system)
- **Keep private** - Never commit Service Tokens to source code repositories
- **Limit scope** - Only use Service Tokens for their intended purpose
- **Monitor usage** - Regularly review and audit Service Token usage

## Using Your Service Token

Once you have generated a Service Token, include it in the `Authorization` header of your API requests:

```bash
curl -H "Authorization: Bearer YOUR_Service Token" \
  https://your-codemetrics-instance/api/system/config
```

### Example API Calls

#### Get System Configuration
```bash
curl -H "Authorization: Bearer YOUR_Service Token" \
  https://your-codemetrics-instance/api/system/config
```

#### Execute a Query
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_Service Token" \
  -H "Content-Type: application/json" \
  -d '{
    "queries": ["code-coverage"],
    "workloads": ["my-team"],
    "dateRange": {
      "start": "2023-01-01",
      "end": "2023-12-31"
    }
  }' \
  https://your-codemetrics-instance/api/query
```

#### Get Pipeline Runs
```bash
curl -H "Authorization: Bearer YOUR_Service Token" \
  "https://your-codemetrics-instance/api/pipeline/runs?workload=my-team&limit=50"
```

## Token Management

### Token Expiration

By default, Service Tokens expire after 1 year. The expiration period can be configured by your CodeMetrics administrator using the `SERVICE_TOKEN_TTL` environment variable.

### Revoking Tokens

If a token is compromised or no longer needed, you can revoke it using the revocation endpoint:

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  https://your-codemetrics-instance/api/tokens/TOKEN_ID
```

> **Note**: You'll need the token ID, which is included in the JWT token itself as the `jti` (JWT ID) claim.

### Rotating Tokens

For security best practices, regularly rotate your Service Tokens:

1. Generate a new Service Token
2. Update your applications to use the new token
3. Revoke the old token
4. Verify all integrations are working with the new token

### Listing Token IDs

You can retrieve a list of existing token metadata to help manage your Service Tokens. This is useful for auditing purposes or when you need to identify specific tokens for revocation. Note that the actual token values are not returned (or stored) - only metadata about each token.

#### List Service Token IDs

To list all Service Token metadata, use the list service token IDs endpoint:

```bash
curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  https://your-codemetrics-instance/api/tokens
```

This will return an array of token metadata objects, each containing information about an active Service Token:

```json
[
  {
    "tokenId": "token-id-1",
    "created": "2024-01-15T10:30:00.000Z",
    "expires": "2025-01-15T10:30:00.000Z",
    "sub": "user@example.com",
    "createdBy": "admin@example.com"
  },
  {
    "tokenId": "token-id-2", 
    "created": "2024-02-01T14:20:00.000Z",
    "expires": "2025-02-01T14:20:00.000Z",
    "sub": "service@example.com",
    "createdBy": "user@example.com"
  }
]
```

**Token Metadata Fields:**
- `tokenId` - The unique JWT ID (jti) of the token
- `created` - When the token was created
- `expires` - When the token will expire
- `sub` - The subject (such as system) the token was created for
- `createdBy` - The user who generated the token

> **Note**: Both endpoints require authentication with a valid session token. The returned `tokenId` values can be used with the revocation endpoint to delete specific tokens. For security reasons, the actual token values are never returned or stored.

## Troubleshooting

### Token Not Working

If your Service Token is not working:

1. **Check token format** - Ensure the token is included correctly in the Authorization header
2. **Verify expiration** - Check if the token has expired
3. **Confirm permissions** - Ensure your user account has the necessary permissions
4. **Check revocation** - Verify the token hasn't been revoked

### Error Responses

Common API error responses when using Service Tokens:

- **401 Unauthorized** - Token is invalid, expired, or missing
- **403 Forbidden** - Token is valid but user lacks required permissions
- **429 Too Many Requests** - Rate limiting is in effect

## Security Best Practices

1. **Use HTTPS** - Always use HTTPS when transmitting Service Tokens
2. **Environment variables** - Store Service Tokens in environment variables, not in code
3. **Minimal scope** - Use tokens only for their intended purpose
4. **Regular rotation** - Rotate tokens on a regular schedule
5. **Monitor usage** - Track and audit Service Token usage
6. **Revoke unused tokens** - Remove tokens that are no longer needed
7. **Secure storage** - Use secret management systems for production environments

## Next Steps

- Generate your first Service Token
- Test the token with a simple API call
- Integrate the token into your custom application or script
- Set up automated token rotation if required
/**
 * Mock for GET /app endpoint (GitHub App authentication check).
 * Returns 200 for GitHub App JWT tokens, 401 for PAT tokens.
 */

var authHeader = context.request.headers["Authorization"] || context.request.headers["authorization"];

// GitHub App authentication uses JWT tokens (format: "Bearer <jwt>")
// PAT authentication uses token format: "token <pat>" or "Bearer <pat>"
// For testing, we'll check if the auth header suggests GitHub App (starts with specific test prefix)
// or just return 401 for simple "dummy" PAT tokens

if (!authHeader) {
  // No auth header - unauthorized
  respond()
    .withStatusCode(401)
    .withHeader("Content-Type", "application/json")
    .withData(JSON.stringify({ message: "Requires authentication" }));
} else if (authHeader.includes("dummy")) {
  // This is a PAT token (our test uses "dummy" for PAT auth)
  // GitHub App endpoints should not work with PAT
  respond()
    .withStatusCode(404)
    .withHeader("Content-Type", "application/json")
    .withData(JSON.stringify({ message: "Not Found" }));
} else {
  // Assume this is GitHub App JWT authentication
  respond()
    .withStatusCode(200)
    .withHeader("Content-Type", "application/json")
    .withFile("GET-app-authenticated.json");
}

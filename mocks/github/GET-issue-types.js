const issueTypes = [
  {
    name: "Bug",
    description: "Something isn't working",
    color: "d73a4a",
  },
  {
    name: "Enhancement",
    description: "New feature or request",
    color: "a2eeef",
  },
  {
    name: "Feature",
    description: "New functionality to be developed",
    color: "0075ca",
  },
  {
    name: "Documentation",
    description: "Improvements or additions to documentation",
    color: "0075ca",
  },
];

const req = context.request;
const { org } = req.pathParams;

// Generate dynamic issue types based on organization name
function generateOrgIssueTypes() {
  const orgIssueTypes = [];

  for (let i = 0; i < issueTypes.length; i++) {
    const baseType = issueTypes[i];

    // Create a new instance for each org to avoid cross-contamination
    const issueType = {
      id: i + 1,
      node_id: `MDc6SXNzdWVUeXBl${btoa((i + 1).toString())}`,
      name: baseType.name,
      description: baseType.description,
      color: baseType.color,
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
      updated_at: new Date().toISOString(),
      is_enabled: true,
    };

    // Add organization specific modifications
    if (org === "octocat" && i === 0) {
      // Change the bug type for octocat org
      issueType.name = "Bug";
      issueType.description = "Critical bugs that need immediate attention";
      issueType.color = "b60205";
    } else if (org === "acme-inc") {
      // Add a custom prefix for acme-inc
      issueType.name = `ACME-${baseType.name}`;
    }

    orgIssueTypes.push(issueType);
  }

  // Add organization-specific custom issue types
  if (org === "octocat") {
    orgIssueTypes.push({
      id: issueTypes.length + 1,
      node_id: `MDc6SXNzdWVUeXBl${btoa((issueTypes.length + 1).toString())}`,
      name: "Security",
      description: "Security-related issues and vulnerabilities",
      color: "d93f0b",
      created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
      updated_at: new Date().toISOString(),
      is_enabled: true,
    });
  }

  return orgIssueTypes;
}

const orgTypes = generateOrgIssueTypes();
console.debug(`Generated ${orgTypes.length} issue types for organization ${org}`);

respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(orgTypes));

// Simple base64 encode function that works in both browser and Node.js environments
function btoa(str) {
  // Simple implementation that creates consistent IDs for the mock data
  // Not meant for production use or security purposes
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let result = "";

  // Use a simple hash of the string to generate a consistent ID
  const hash = str.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Generate a deterministic 8-character base64 string from the hash
  for (let i = 0; i < 8; i++) {
    result += charset[(hash * (i + 1)) % 64];
  }

  return result;
}

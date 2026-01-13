// Configuration
const issueTypes = ["bug", "enhancement", "feature", "documentation"];
const priorities = ["priority:high", "priority:medium", "priority:low"];
const priorityColors = { "priority:high": "b60205", "priority:medium": "fbca04", "priority:low": "c2e0c6" };
const issueTypeColors = { bug: "d73a4a", enhancement: "a2eeef", feature: "0075ca", documentation: "0075ca" };
const users = ["octocat", "developer1", "developer2", "developer3"];

const req = context.request;
const { owner, repo, issue_number } = req.pathParams;
const issueNum = parseInt(issue_number, 10);

// Function to generate consistent data for the same issue number
function generateIssue() {
  // Use issue number to ensure consistency in generated data
  const seed = issueNum;

  // Generate deterministic values based on the issue number
  const issueType = issueTypes[seed % issueTypes.length];
  const priority = priorities[seed % priorities.length];

  // Generate consistent dates
  const now = new Date();
  const baseDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // Start 60 days ago

  // Created date: spread throughout last 60 days
  const dayOffset = (seed * 13) % 60; // Multiply by prime for better distribution
  const createdDate = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);

  // Determine if issue is closed (even numbers are closed)
  const isClosed = issueNum % 2 === 0;

  // For closed issues, set a closed date 2-30 days after creation
  const closingDays = ((seed * 7) % 28) + 2; // Between 2 and 30 days
  const closedDate = isClosed ? new Date(createdDate.getTime() + closingDays * 24 * 60 * 60 * 1000) : null;

  // Updated date is either closed date or somewhere between created and now
  let updatedDate;
  try {
    updatedDate = closedDate || new Date(createdDate.getTime() + ((seed * 11) % 60) * 24 * 60 * 60 * 1000);
    // Sanity check - if updatedDate is invalid, use created date
    if (isNaN(updatedDate.getTime())) {
      updatedDate = new Date(createdDate);
    }
  } catch (e) {
    // Fallback to created date if there's any error
    updatedDate = new Date(createdDate);
  }

  // Assignee depends on issue number
  const assigneeIndex = seed % (users.length + 1); // Add 1 for possibility of null
  const hasAssignee = assigneeIndex < users.length;
  const assignee = hasAssignee
    ? {
        login: users[assigneeIndex],
        id: assigneeIndex + 1,
      }
    : null;

  // Create issue titles based on type
  let title;
  switch (issueType) {
    case "bug":
      title = `Fix ${["login", "checkout", "profile", "search", "payment"][seed % 5]} functionality bug`;
      break;
    case "enhancement":
      title = `Enhance ${["user interface", "performance", "accessibility", "mobile experience"][seed % 4]}`;
      break;
    case "feature":
      title = `Add ${["dark mode", "export to PDF", "social sharing", "two-factor authentication"][seed % 4]} feature`;
      break;
    case "documentation":
      title = `Update documentation for ${["API", "setup process", "configuration", "deployment"][seed % 4]}`;
      break;
    default:
      title = `Issue ${issueNum}`;
  }

  // Create the issue object
  return {
    id: issueNum,
    node_id: `MDU6SXNzdWU${btoa(issueNum.toString())}`,
    url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNum}`,
    repository_url: `https://api.github.com/repos/${owner}/${repo}`,
    labels_url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNum}/labels{/name}`,
    comments_url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNum}/comments`,
    events_url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNum}/events`,
    html_url: `https://github.com/${owner}/${repo}/issues/${issueNum}`,
    number: issueNum,
    state: isClosed ? "closed" : "open",
    title: title,
    body: `This is a detailed description for the ${issueType} related to ${title.toLowerCase()}.\n\nIt includes steps to reproduce, expected behavior, and additional context where applicable.`,
    user: {
      login: "octocat", // Default creator
      id: 1,
    },
    labels: [
      {
        id: issueTypes.indexOf(issueType) + 1,
        node_id: `MDU6TGFiZWw${btoa((issueTypes.indexOf(issueType) + 1).toString())}`,
        url: `https://api.github.com/repos/${owner}/${repo}/labels/${issueType}`,
        name: issueType,
        color: issueTypeColors[issueType],
      },
      {
        id: priorities.indexOf(priority) + issueTypes.length + 1,
        node_id: `MDU6TGFiZWw${btoa((priorities.indexOf(priority) + issueTypes.length + 1).toString())}`,
        url: `https://api.github.com/repos/${owner}/${repo}/labels/${priority}`,
        name: priority,
        color: priorityColors[priority],
      },
    ],
    assignee: assignee,
    created_at: createdDate && !isNaN(createdDate.getTime()) ? createdDate.toISOString() : new Date().toISOString(),
    updated_at: updatedDate && !isNaN(updatedDate.getTime()) ? updatedDate.toISOString() : new Date().toISOString(),
    closed_at: closedDate && !isNaN(closedDate.getTime()) ? closedDate.toISOString() : null,
  };
}

// Check if issue number is valid - only return issues for reasonable range (1-100)
if (isNaN(issueNum) || issueNum <= 0 || issueNum > 100) {
  respond()
    .withStatusCode(404)
    .withData(
      JSON.stringify({
        message: "Not Found",
        documentation_url: "https://docs.github.com/rest/issues/issues#get-an-issue",
      })
    );
} else {
  // Generate issue based on issue number
  const issue = generateIssue();
  console.debug(`Generated issue ${issueNum} for ${owner}/${repo}`);

  respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(issue));
}

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

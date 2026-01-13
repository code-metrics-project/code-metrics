const MILLIS_PER_DAY = 1000 * 3600 * 24;

// Configuration
const issueTypes = ["bug", "enhancement", "feature", "documentation"];
const priorities = ["priority:high", "priority:medium", "priority:low"];
const priorityColors = { "priority:high": "b60205", "priority:medium": "fbca04", "priority:low": "c2e0c6" };
const issueTypeColors = { bug: "d73a4a", enhancement: "a2eeef", feature: "0075ca", documentation: "ffacdd" };
const users = ["octocat", "developer1", "developer2", "developer3"];

// Date setup
const now = new Date();
now.setHours(0, 0, 0, 0);

const req = context.request;
const { owner, repo } = req.pathParams;
const since = req.queryParams.since ? new Date(req.queryParams.since) : new Date(now - MILLIS_PER_DAY * 365);
const state = req.queryParams.state || "all";

// Generate a random number of issues between min and max
function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a fixed number of issues by default, or vary by repo
let issueCount;
if (repo === "Hello-World") {
  // Use a fixed number for specific repos to ensure consistency
  issueCount = 12;
} else {
  // Otherwise generate a random number based on the repo name
  // (but consistently the same for the same repo)
  const repoHash = repo.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  issueCount = 5 + (repoHash % 15); // between 5 and 20 issues
}

// Generate issues with multiple per day, skewed to weekdays
const issues = generateIssues(issueCount);
console.debug(`Generated ${issues.length} issues for ${owner}/${repo}`);

// Log the distribution of issues by day of week
const dayDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
issues.forEach((issue) => {
  const date = new Date(issue.created_at);
  const dayOfWeek = date.getDay();
  dayDistribution[dayOfWeek]++;
});

console.debug(`Day of week distribution: 
  Sunday: ${dayDistribution[0]}, 
  Monday: ${dayDistribution[1]}, 
  Tuesday: ${dayDistribution[2]}, 
  Wednesday: ${dayDistribution[3]}, 
  Thursday: ${dayDistribution[4]}, 
  Friday: ${dayDistribution[5]}, 
  Saturday: ${dayDistribution[6]}
`);

respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(issues));

function generateIssues(count) {
  const issues = [];
  let closedCount = Math.floor(count * 0.4); // 40% of issues are closed

  // Generate a date range starting from 60 days ago until now (daily)
  const startDate = new Date(now - MILLIS_PER_DAY * 60);
  const dateRange = [];

  // Generate dates for the past 60 days (one entry per day)
  for (let day = 0; day <= 60; day++) {
    const date = new Date(startDate.getTime() + MILLIS_PER_DAY * day);
    dateRange.push(date);
  }

  // Total number of issues to generate (more than the count to ensure we have enough after filtering)
  const totalIssuesToGenerate = count * 3;
  const generatedIssues = [];

  // First generate the raw issues with dates
  for (let i = 0; i < totalIssuesToGenerate; i++) {
    const issueNumber = i + 1;
    const issueType = issueTypes[i % issueTypes.length];
    const priorityIndex = Math.floor(Math.random() * priorities.length);
    const priority = priorities[priorityIndex];

    // Select a date with weekday skew (Monday-Friday are more likely)
    let dateIndex;
    const useWeekdaySkew = Math.random() < 0.75; // 75% chance to use weekday skew

    if (useWeekdaySkew) {
      // Keep trying until we get a weekday (or eventually give up)
      let attempts = 0;
      let foundWeekday = false;

      while (!foundWeekday && attempts < 10) {
        dateIndex = Math.floor(Math.random() * dateRange.length);
        const dayOfWeek = dateRange[dateIndex].getDay();
        // 0 is Sunday, 6 is Saturday, so 1-5 are weekdays
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          foundWeekday = true;
        }
        attempts++;
      }

      if (!foundWeekday) {
        // If we didn't find a weekday after several attempts, just use any day
        dateIndex = Math.floor(Math.random() * dateRange.length);
      }
    } else {
      // Just pick a random date
      dateIndex = Math.floor(Math.random() * dateRange.length);
    }

    const createdDate = dateRange[dateIndex];

    // 60% of issues stay open, 40% are closed
    const isClosed = i < closedCount;
    const closedDate = isClosed ? new Date(createdDate.getTime() + MILLIS_PER_DAY * randomRange(1, 30)) : null;

    // For closed issues, ensure the closed date is not in the future and not null
    const adjustedClosedDate = closedDate && closedDate > now ? now : closedDate;

    // Updated date is either the closed date or sometime between created and now
    // Ensure we always have a valid date object (fallback to created date if calculation fails)
    let updatedDate;
    try {
      const daysSinceCreation = Math.max(0, Math.floor((now - createdDate) / MILLIS_PER_DAY));
      updatedDate =
        adjustedClosedDate || new Date(createdDate.getTime() + MILLIS_PER_DAY * randomRange(0, daysSinceCreation));

      // Sanity check - if update date is invalid, use created date
      if (isNaN(updatedDate.getTime())) {
        updatedDate = new Date(createdDate);
      }
    } catch (e) {
      // Fallback to created date if there's any error
      updatedDate = new Date(createdDate);
    }

    // Skip if state filter doesn't match
    if (state !== "all" && ((state === "open" && isClosed) || (state === "closed" && !isClosed))) {
      continue;
    }

    // Generate a unique ID (normally this would be a sequential integer in GitHub)
    const id = i + 1;
    const nodeId = `MDU6SXNzdWU${btoa(id.toString())}`;

    // Assign to a random user
    const assigneeIndex = Math.floor(Math.random() * (users.length + 1)); // +1 for possibility of null
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
        title = `Fix ${["login", "checkout", "profile", "search", "payment"][i % 5]} functionality bug`;
        break;
      case "enhancement":
        title = `Enhance ${["user interface", "performance", "accessibility", "mobile experience"][i % 4]}`;
        break;
      case "feature":
        title = `Add ${["dark mode", "export to PDF", "social sharing", "two-factor authentication"][i % 4]} feature`;
        break;
      case "documentation":
        title = `Update documentation for ${["API", "setup process", "configuration", "deployment"][i % 4]}`;
        break;
      default:
        title = `Issue ${issueNumber}`;
    }

    // Create the base issue object
    const issue = {
      id: id,
      node_id: nodeId,
      url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      repository_url: `https://api.github.com/repos/${owner}/${repo}`,
      labels_url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels{/name}`,
      comments_url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      events_url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/events`,
      html_url: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
      number: issueNumber,
      state: isClosed ? "closed" : "open",
      title: title,
      body: `This is a detailed description for the ${issueType} related to ${title.toLowerCase()}.`,
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
      created_at: createdDate ? createdDate.toISOString() : new Date().toISOString(),
      updated_at: updatedDate ? updatedDate.toISOString() : new Date().toISOString(),
      closed_at: adjustedClosedDate ? adjustedClosedDate.toISOString() : null,
    };

    generatedIssues.push(issue);
  }

  // Group issues by date
  const issuesByDate = {};
  generatedIssues.forEach((issue) => {
    // Ensure created_at exists and is a valid string
    const dateKey =
      issue.created_at && typeof issue.created_at === "string"
        ? issue.created_at.split("T")[0] // YYYY-MM-DD format
        : new Date().toISOString().split("T")[0]; // Fallback to today
    if (!issuesByDate[dateKey]) {
      issuesByDate[dateKey] = [];
    }
    issuesByDate[dateKey].push(issue);
  });

  // Apply state filtering if needed
  let filteredIssues = [];
  Object.keys(issuesByDate).forEach((dateKey) => {
    const dateIssues = issuesByDate[dateKey];

    // Filter by state if specified
    const stateFilteredIssues = dateIssues.filter((issue) => {
      if (state === "all") return true;
      return (state === "open" && issue.state === "open") || (state === "closed" && issue.state === "closed");
    });

    // Take up to 5 issues per day, but ensure at least 2 for weekdays if available
    if (stateFilteredIssues.length > 0) {
      const sampleDate = new Date(dateKey);
      const dayOfWeek = sampleDate.getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

      // For weekdays, ensure at least 2-5 issues if available
      const issuesToTake = isWeekday
        ? Math.min(stateFilteredIssues.length, 2 + Math.floor(Math.random() * 4))
        : Math.min(stateFilteredIssues.length, 1 + Math.floor(Math.random() * 2));

      filteredIssues.push(...stateFilteredIssues.slice(0, issuesToTake));
    }
  });

  // Sort by issue number to ensure consistent ordering
  filteredIssues.sort((a, b) => a.number - b.number);

  // Take at most the requested count, but ensure we have a minimum number of issues
  const finalIssueCount = Math.max(count, Math.min(filteredIssues.length, count * 2));
  return filteredIssues.slice(0, finalIssueCount);
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

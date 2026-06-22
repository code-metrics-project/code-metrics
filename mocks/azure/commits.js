// Polyfill for random.uuid() - required in Docker environment
var random = typeof random !== "undefined" ? random : undefined;
if (!random) {
  random = {
    uuid: function () {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  };
}

const MILLIS_PER_DAY = 1000 * 3600 * 24;

const now = new Date();
now.setHours(0, 0, 0, 0);

const req = context.request;
const { projectName, repoName, pullRequestId } = req.pathParams;
const fromDateStr = req.queryParams["searchCriteria.fromDate"] || new Date().toISOString().split("T")[0];
const fromDate = new Date(fromDateStr);

// Pagination parameters
const skip = parseInt(req.queryParams["$skip"] || "0", 10);
const top = parseInt(req.queryParams["$top"] || "100", 10);

// whether to look up historic churn
let useHistoric;
if (repoName === "spring-petclinic") {
  console.debug("Using historic commit data");
  useHistoric = true;
} else {
  console.debug("Generating synthetic commit data");
  useHistoric = false;
}

let commitCount = pullRequestId ? 1 : useHistoric ? lookupHistoric(fromDate) : getCommitCount(fromDate);

// always return a minimum of 1
commitCount = Math.max(1, commitCount);

const allCommits = generateCommits(commitCount);

// Apply pagination
const totalCount = allCommits.length;
const paginatedCommits = allCommits.slice(skip, skip + top);

const response = {
  count: paginatedCommits.length,
  value: paginatedCommits,
};

console.debug(
  `Generated ${totalCount} total commits, returning ${paginatedCommits.length} (skip=${skip}, top=${top}) for ${projectName}/${repoName} on ${fromDateStr}`
);
respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(response));

function generateCommits(commitCount) {
  const commits = [];

  // Arrays of varied data for realistic commits
  const authors = [
    { name: "Ada Lovelace", email: "ada.lovelace@example.com" },
    { name: "Grace Hopper", email: "grace.hopper@example.com" },
    { name: "Alan Turing", email: "alan.turing@example.com" },
    { name: "Margaret Hamilton", email: "margaret.hamilton@example.com" },
    { name: "Linus Torvalds", email: "linus.torvalds@example.com" },
    { name: "Barbara Liskov", email: "barbara.liskov@example.com" },
    { name: "Dennis Ritchie", email: "dennis.ritchie@example.com" },
    { name: "Frances Allen", email: "frances.allen@example.com" },
  ];

  const commitTypes = [
    { prefix: "feat", description: "add new feature" },
    { prefix: "fix", description: "fix bug in" },
    { prefix: "refactor", description: "refactor" },
    { prefix: "docs", description: "update documentation for" },
    { prefix: "test", description: "add tests for" },
    { prefix: "chore", description: "update dependencies in" },
    { prefix: "perf", description: "improve performance of" },
    { prefix: "style", description: "format code in" },
  ];

  const components = [
    "user authentication",
    "payment processing",
    "database queries",
    "API endpoints",
    "UI components",
    "email notifications",
    "data validation",
    "error handling",
    "logging system",
    "caching layer",
    "file uploads",
    "search functionality",
    "user profile",
    "admin dashboard",
    "reporting module",
    "configuration loader",
  ];

  const issues = [
    "PROJ-1001",
    "PROJ-1002",
    "PROJ-1003",
    "PROJ-1004",
    "PROJ-1005",
    "BUG-501",
    "BUG-502",
    "BUG-503",
    "FEAT-201",
    "FEAT-202",
    "FEAT-203",
  ];

  for (let i = 0; i < commitCount; i++) {
    const gCommitId = random.uuid();

    // Pick random author
    const author = authors[Math.floor(Math.random() * authors.length)];

    // Sometimes committer is same as author, sometimes different
    const committer = Math.random() < 0.7 ? author : authors[Math.floor(Math.random() * authors.length)];

    // Generate realistic change counts that vary across Add/Edit/Delete
    // Most commits have more edits than adds/deletes
    const editCount = Math.round(Math.random() * 25) + 1; // 1-26 edits
    const addCount = Math.round(Math.random() * 15); // 0-15 additions
    const deleteCount = Math.round(Math.random() * 10); // 0-10 deletions

    // Random time between 7am and 7pm
    const randTime = new Date(
      new Date().setHours(7, Math.floor(Math.random() * 60 * 12 + 1), Math.floor(Math.random() * 60), 0)
    )
      .toTimeString()
      .slice(0, 8);

    // Generate varied commit message
    const commitType = commitTypes[Math.floor(Math.random() * commitTypes.length)];
    const component = components[Math.floor(Math.random() * components.length)];

    // 60% chance to include issue reference
    const issueRef = Math.random() < 0.6 ? ` [${issues[Math.floor(Math.random() * issues.length)]}]` : "";

    const comment = `${commitType.prefix}: ${commitType.description} ${component}${issueRef}`;

    commits.push({
      commitId: gCommitId,
      author: {
        name: author.name,
        email: author.email,
        date: `${fromDateStr}T${randTime}Z`,
      },
      committer: {
        name: committer.name,
        email: committer.email,
        date: `${fromDateStr}T${randTime}Z`,
      },
      comment: comment,
      commentTruncated: true,
      changeCounts: {
        Add: addCount,
        Edit: editCount,
        Delete: deleteCount,
      },
      url: "${system.server.url}/019f028e-3986-4a03-b572-b9a154cd9218/_apis/git/repositories/52d32aef-1397-4252-ae05-4092f7702fa5/commits/4753b4a1afbd91256fdf620c53ff73ca75064f41",
      remoteUrl: `$\{system.server.url}/${projectName}/_git/${repoName}/commit/${gCommitId}`,
    });
  }
  return commits;
}

function getCommitCount(date) {
  let commitCount = Math.random() * 10;

  // weekends
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    commitCount *= 0.1;
  }

  // monthly bias
  commitCount *= 1 + ((date.getMonth() % 3) + 1) * 2;
  return Math.round(commitCount);
}

function lookupHistoric(date) {
  const churnStore = stores.open("churn");
  const historic = churnStore.load("data");

  const daysAgo = Math.floor((now.getTime() - date.getTime()) / MILLIS_PER_DAY);
  const dayIdx = Math.max(0, historic.length - 1 - daysAgo);
  const churn = historic[dayIdx];

  console.debug(`${date} churn: ${churn}`);
  return churn;
}

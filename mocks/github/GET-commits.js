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

const req = context.request;
const { owner, repo } = req.pathParams;

// Arrays of varied data for realistic commits
const authors = [
  { name: "Ada Lovelace", email: "ada.lovelace@example.com", login: "adalovelace" },
  { name: "Grace Hopper", email: "grace.hopper@example.com", login: "gracehopper" },
  { name: "Alan Turing", email: "alan.turing@example.com", login: "alanturing" },
  { name: "Margaret Hamilton", email: "margaret.hamilton@example.com", login: "margarethamilton" },
  { name: "Linus Torvalds", email: "linus.torvalds@example.com", login: "linustorvalds" },
  { name: "Barbara Liskov", email: "barbara.liskov@example.com", login: "barbaraliskov" },
  { name: "Dennis Ritchie", email: "dennis.ritchie@example.com", login: "dennisritchie" },
  { name: "Frances Allen", email: "frances.allen@example.com", login: "francesallen" },
];

const commitTypes = [
  { prefix: "feat", description: "add new feature for" },
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
  "#101",
  "#102",
  "#103",
  "#104",
  "#105",
  "#201",
  "#202",
  "#203",
  "#301",
  "#302",
  "#303",
];

// Get the requested date from query params or use current date
const since = req.queryParams["since"] ? new Date(req.queryParams["since"]) : new Date();
const until = req.queryParams["until"] ? new Date(req.queryParams["until"]) : new Date();

// Generate 5-15 commits
const commitCount = Math.floor(Math.random() * 11) + 5;
const commits = [];

for (let i = 0; i < commitCount; i++) {
  const sha = random.uuid().replace(/-/g, "");
  const shortSha = sha.substring(0, 7);

  // Pick random author
  const author = authors[Math.floor(Math.random() * authors.length)];

  // Sometimes committer is same as author, sometimes different
  const committer = Math.random() < 0.7 ? author : authors[Math.floor(Math.random() * authors.length)];

  // Generate varied commit message
  const commitType = commitTypes[Math.floor(Math.random() * commitTypes.length)];
  const component = components[Math.floor(Math.random() * components.length)];

  // 60% chance to include issue reference
  const issueRef = Math.random() < 0.6 ? ` (${issues[Math.floor(Math.random() * issues.length)]})` : "";

  const message = `${commitType.prefix}: ${commitType.description} ${component}${issueRef}`;

  // Random date between since and until
  const timeDiff = until.getTime() - since.getTime();
  const randomTime = since.getTime() + Math.random() * timeDiff;
  const commitDate = new Date(randomTime);

  // Set to business hours (7am - 7pm)
  commitDate.setHours(7 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

  commits.push({
    url: `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`,
    sha: sha,
    node_id: `MDY6Q29tbWl0${shortSha}`,
    html_url: `https://github.com/${owner}/${repo}/commit/${sha}`,
    comments_url: `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/comments`,
    commit: {
      url: `https://api.github.com/repos/${owner}/${repo}/git/commits/${sha}`,
      author: {
        name: author.name,
        email: author.email,
        date: commitDate.toISOString(),
      },
      committer: {
        name: committer.name,
        email: committer.email,
        date: commitDate.toISOString(),
      },
      message: message,
      tree: {
        url: `https://api.github.com/repos/${owner}/${repo}/tree/${sha}`,
        sha: sha,
      },
      comment_count: 0,
      verification: {
        verified: false,
        reason: "unsigned",
        signature: null,
        payload: null,
      },
    },
    author: {
      login: author.login,
      id: Math.floor(Math.random() * 1000000),
      node_id: `MDQ6VXNlcjE=`,
      avatar_url: `https://github.com/images/error/${author.login}.gif`,
      gravatar_id: "",
      url: `https://api.github.com/users/${author.login}`,
      html_url: `https://github.com/${author.login}`,
      followers_url: `https://api.github.com/users/${author.login}/followers`,
      following_url: `https://api.github.com/users/${author.login}/following{/other_user}`,
      gists_url: `https://api.github.com/users/${author.login}/gists{/gist_id}`,
      starred_url: `https://api.github.com/users/${author.login}/starred{/owner}{/repo}`,
      subscriptions_url: `https://api.github.com/users/${author.login}/subscriptions`,
      organizations_url: `https://api.github.com/users/${author.login}/orgs`,
      repos_url: `https://api.github.com/users/${author.login}/repos`,
      events_url: `https://api.github.com/users/${author.login}/events{/privacy}`,
      received_events_url: `https://api.github.com/users/${author.login}/received_events`,
      type: "User",
      site_admin: false,
    },
    committer: {
      login: committer.login,
      id: Math.floor(Math.random() * 1000000),
      node_id: `MDQ6VXNlcjE=`,
      avatar_url: `https://github.com/images/error/${committer.login}.gif`,
      gravatar_id: "",
      url: `https://api.github.com/users/${committer.login}`,
      html_url: `https://github.com/${committer.login}`,
      followers_url: `https://api.github.com/users/${committer.login}/followers`,
      following_url: `https://api.github.com/users/${committer.login}/following{/other_user}`,
      gists_url: `https://api.github.com/users/${committer.login}/gists{/gist_id}`,
      starred_url: `https://api.github.com/users/${committer.login}/starred{/owner}{/repo}`,
      subscriptions_url: `https://api.github.com/users/${committer.login}/subscriptions`,
      organizations_url: `https://api.github.com/users/${committer.login}/orgs`,
      repos_url: `https://api.github.com/users/${committer.login}/repos`,
      events_url: `https://api.github.com/users/${committer.login}/events{/privacy}`,
      received_events_url: `https://api.github.com/users/${committer.login}/received_events`,
      type: "User",
      site_admin: false,
    },
    parents: [
      {
        url: `https://api.github.com/repos/${owner}/${repo}/commits/${random.uuid().replace(/-/g, "")}`,
        sha: random.uuid().replace(/-/g, ""),
      },
    ],
  });
}

console.debug(`Generated ${commits.length} commits for ${owner}/${repo}`);
respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(commits));

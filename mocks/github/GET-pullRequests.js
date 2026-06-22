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

// Arrays of varied PR data
const prTypes = [
  { prefix: "feat", action: "Add", component: "feature" },
  { prefix: "fix", action: "Fix", component: "bug" },
  { prefix: "refactor", action: "Refactor", component: "improvement" },
  { prefix: "perf", action: "Optimize", component: "performance" },
  { prefix: "docs", action: "Update", component: "documentation" },
  { prefix: "test", action: "Add", component: "test coverage" },
];

const features = [
  "user authentication flow",
  "payment gateway integration",
  "email notification system",
  "dashboard analytics",
  "file upload functionality",
  "search and filtering",
  "data export feature",
  "user profile management",
  "admin panel controls",
  "reporting system",
  "API rate limiting",
  "caching mechanism",
  "error logging",
  "session management",
  "two-factor authentication",
];

const authors = [
  { name: "Ada Lovelace", login: "adalovelace" },
  { name: "Grace Hopper", login: "gracehopper" },
  { name: "Alan Turing", login: "alanturing" },
  { name: "Margaret Hamilton", login: "margarethamilton" },
  { name: "Linus Torvalds", login: "linustorvalds" },
  { name: "Barbara Liskov", login: "barbaraliskov" },
];

// Generate 10-20 PRs
const prCount = Math.floor(Math.random() * 11) + 10;
const prs = [];
const now = new Date();

for (let i = 0; i < prCount; i++) {
  const prNumber = 1000 + Math.floor(Math.random() * 9000);
  const issueNumber = 100 + Math.floor(Math.random() * 900);
  const sha = random.uuid().replace(/-/g, "");

  // Generate varied PR content
  const prType = prTypes[Math.floor(Math.random() * prTypes.length)];
  const feature = features[Math.floor(Math.random() * features.length)];
  const author = authors[Math.floor(Math.random() * authors.length)];

  const prTitle = `${prType.action} ${feature}`;
  const prBody = `This PR ${prType.action.toLowerCase()}s ${feature}.\n\nCloses #${issueNumber}`;
  const branchName = `${prType.prefix}/${feature.replace(/\s+/g, "-")}`;

  // Random dates for created/merged
  const daysAgo = Math.floor(Math.random() * 60); // 0-60 days ago
  const createdDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const mergedDate = new Date(createdDate.getTime() + (Math.random() * 48 + 2) * 60 * 60 * 1000); // 2-50 hours after created

  prs.push({
    url: `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    id: prNumber,
    node_id: `MDExOlB1bGxSZXF1ZXN0${prNumber}`,
    html_url: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
    diff_url: `https://github.com/${owner}/${repo}/pull/${prNumber}.diff`,
    patch_url: `https://github.com/${owner}/${repo}/pull/${prNumber}.patch`,
    issue_url: `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}`,
    commits_url: `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/commits`,
    review_comments_url: `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
    review_comment_url: `https://api.github.com/repos/${owner}/${repo}/pulls/comments{/number}`,
    comments_url: `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    statuses_url: `https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`,
    number: prNumber,
    state: "closed",
    locked: false,
    title: `#${issueNumber} - ${prTitle}`,
    user: {
      login: author.login,
      id: Math.floor(Math.random() * 1000000),
      node_id: `MDQ6VXNlcjE=`,
      avatar_url: `https://github.com/images/error/${author.login}_happy.gif`,
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
    body: prBody,
    labels: [],
    milestone: null,
    active_lock_reason: null,
    created_at: createdDate.toISOString(),
    updated_at: mergedDate.toISOString(),
    closed_at: mergedDate.toISOString(),
    merged_at: mergedDate.toISOString(),
    merge_commit_sha: sha,
    assignee: null,
    assignees: [],
    requested_reviewers: [],
    requested_teams: [],
    head: {
      label: `${owner}:${branchName}`,
      ref: branchName,
      sha: sha,
      user: {
        login: author.login,
        id: Math.floor(Math.random() * 1000000),
        node_id: `MDQ6VXNlcjE=`,
        avatar_url: `https://github.com/images/error/${author.login}_happy.gif`,
        gravatar_id: "",
        url: `https://api.github.com/users/${author.login}`,
        html_url: `https://github.com/${author.login}`,
        type: "User",
        site_admin: false,
      },
      repo: {
        id: 1296269,
        node_id: "MDEwOlJlcG9zaXRvcnkxMjk2MjY5",
        name: repo,
        full_name: `${owner}/${repo}`,
        private: false,
        html_url: `https://github.com/${owner}/${repo}`,
        description: `This is the ${repo} repository`,
        fork: false,
        url: `https://api.github.com/repos/${owner}/${repo}`,
        default_branch: "main",
      },
    },
    base: {
      label: `${owner}:main`,
      ref: "main",
      sha: random.uuid().replace(/-/g, ""),
      user: {
        login: owner,
        id: 1,
        node_id: `MDQ6VXNlcjE=`,
        avatar_url: `https://github.com/images/error/${owner}_happy.gif`,
        type: "User",
        site_admin: false,
      },
      repo: {
        id: 1296269,
        node_id: "MDEwOlJlcG9zaXRvcnkxMjk2MjY5",
        name: repo,
        full_name: `${owner}/${repo}`,
        private: false,
        html_url: `https://github.com/${owner}/${repo}`,
        description: `This is the ${repo} repository`,
        fork: false,
        url: `https://api.github.com/repos/${owner}/${repo}`,
        default_branch: "main",
      },
    },
    _links: {
      self: {
        href: `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      },
      html: {
        href: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
      },
      issue: {
        href: `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}`,
      },
      comments: {
        href: `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      },
      review_comments: {
        href: `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
      },
      review_comment: {
        href: `https://api.github.com/repos/${owner}/${repo}/pulls/comments{/number}`,
      },
      commits: {
        href: `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/commits`,
      },
      statuses: {
        href: `https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`,
      },
    },
    author_association: "CONTRIBUTOR",
    auto_merge: null,
    draft: false,
  });
}

console.debug(`Generated ${prs.length} PRs for ${owner}/${repo}`);
respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(prs));

const req = context.request;
const { owner, repo, run_id } = req.pathParams;

const now = new Date();

function isoDaysAgo(daysAgo, hour = 10, minute = 0, second = 0) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, second, 0);
  return d.toISOString();
}

const runStarted = isoDaysAgo(1, 10, 33, 8);
const runUpdated = isoDaysAgo(1, 10, 43, 8);

const payload = {
  id: parseInt(run_id, 10),
  name: "Build",
  head_branch: "main",
  head_sha: "acb5820ced9479c074f688cc328bf03f341a511d",
  run_number: 562,
  event: "push",
  status: "completed",
  conclusion: "success",
  workflow_id: 159038,
  url: `https://api.github.com/repos/${owner}/${repo}/actions/runs/${run_id}`,
  html_url: `https://github.com/${owner}/${repo}/actions/runs/${run_id}`,
  created_at: runStarted,
  updated_at: runUpdated,
  run_started_at: runStarted,
  actor: {
    login: "octocat",
    type: "User",
  },
  repository: {
    name: "hello-world",
  },
  head_commit: {
    id: "acb5820ced9479c074f688cc328bf03f341a511d",
    timestamp: isoDaysAgo(1, 10, 33, 5),
  },
};

respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(payload));

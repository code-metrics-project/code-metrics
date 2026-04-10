const req = context.request;
const { owner, repo } = req.pathParams;

const now = new Date();

function isoDaysAgo(daysAgo, hour = 10, minute = 0, second = 0) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, second, 0);
  return d.toISOString();
}

const run1Started = isoDaysAgo(1, 10, 33, 8);
const run1Updated = isoDaysAgo(1, 10, 43, 8);
const run2Started = isoDaysAgo(2, 11, 33, 8);
const run2Updated = isoDaysAgo(2, 11, 43, 8);

const conclusions = ["success", "failure", "cancelled"];
const randomConclusion = conclusions[Math.floor(Math.random() * conclusions.length)];
const randomConclusion2 = conclusions[Math.floor(Math.random() * conclusions.length)];

const payload = {
  total_count: 2,
  workflow_runs: [
    {
      id: 30433642,
      name: "Build",
      head_branch: "main",
      head_sha: "acb5820ced9479c074f688cc328bf03f341a511d",
      run_number: 562,
      event: "push",
      status: "completed",
      conclusion: randomConclusion,
      workflow_id: 159038,
      url: `https://api.github.com/repos/${owner}/${repo}/actions/runs/30433642`,
      html_url: `https://github.com/${owner}/${repo}/actions/runs/30433642`,
      created_at: run1Started,
      updated_at: run1Updated,
      run_started_at: run1Started,
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
    },
    {
      id: 30433643,
      name: "Build",
      head_branch: "main",
      head_sha: "acb5820ced9479c074f688cc328bf03f341a511d",
      run_number: 563,
      event: "push",
      status: "completed",
      conclusion: randomConclusion2,
      workflow_id: 159039,
      url: `https://api.github.com/repos/${owner}/${repo}/actions/runs/30433643`,
      html_url: `https://github.com/${owner}/${repo}/actions/runs/30433643`,
      created_at: run2Started,
      updated_at: run2Updated,
      run_started_at: run2Started,
      actor: {
        login: "octocat",
        type: "User",
      },
      repository: {
        name: "hello-world",
      },
      head_commit: {
        id: "acb5820ced9479c074f688cc328bf03f341a511d",
        timestamp: isoDaysAgo(2, 11, 33, 5),
      },
    },
  ],
};

respond().withHeader("Content-Type", "application/json").withData(JSON.stringify(payload));
